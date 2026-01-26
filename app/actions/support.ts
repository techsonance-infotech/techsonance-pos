'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { notifyTicketCreated, notifyTicketAssigned, notifyTicketReplied, notifyTicketStatusChanged } from "./support-notifications"

// ========== TYPES ==========
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TicketCategory = 'BILLING' | 'HARDWARE' | 'KDS' | 'INVENTORY' | 'LOGIN' | 'PRINTER' | 'OTHER'

// SLA Defaults (in hours)
const SLA_RULES: Record<TicketPriority, { firstResponse: number, resolution: number }> = {
    CRITICAL: { firstResponse: 0.25, resolution: 4 },
    HIGH: { firstResponse: 1, resolution: 24 },
    MEDIUM: { firstResponse: 4, resolution: 72 },
    LOW: { firstResponse: 24, resolution: 168 }
}

// ========== TICKET CREATION (POS Side) ==========
export async function createTicket(data: {
    subject: string
    category: string
    priority?: string
    description: string
    attachments?: string
    systemInfo?: string
}) {
    const user = await getUserProfile()
    if (!user) throw new Error("Unauthorized")

    const priority = (data.priority || 'MEDIUM') as TicketPriority
    const slaHours = SLA_RULES[priority]?.resolution || 72
    const dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000)

    // Generate ticket number
    const year = new Date().getFullYear()
    const lastTicket = await prisma.supportTicket.findFirst({
        orderBy: { ticketIndex: 'desc' }
    })
    const nextIndex = (lastTicket?.ticketIndex || 0) + 1
    const ticketNumber = `SS-${year}-${String(nextIndex).padStart(6, '0')}`

    const ticket = await prisma.supportTicket.create({
        data: {
            ticketNumber,
            ticketIndex: nextIndex,
            tenantId: user.companyId!,
            outletId: user.defaultStoreId,
            createdById: user.id,
            subject: data.subject,
            category: data.category,
            priority,
            status: 'OPEN',
            channel: 'POS',
            dueAt,
            appVersion: process.env.npm_package_version,
            deviceOS: 'Unknown',
        }
    })

    // Add initial message (description)
    await prisma.supportMessage.create({
        data: {
            ticketId: ticket.id,
            senderId: user.id,
            message: data.description,
            attachments: data.attachments || null
        }
    })

    // Log
    await prisma.supportLog.create({
        data: {
            ticketId: ticket.id,
            actorUserId: user.id,
            actorRole: user.role,
            action: 'CREATED',
            details: JSON.stringify({ subject: data.subject, priority })
        }
    })

    await logAudit({
        module: 'SUPPORT',
        action: 'TICKET_CREATED',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        after: ticket as any
    })

    revalidatePath('/dashboard/support')

    // Notify Super Admins about new ticket
    notifyTicketCreated(ticket.id).catch(console.error)

    return ticket
}

// ========== GET TICKETS (For current user) ==========
export async function getTickets(filter?: { status?: string }) {
    const user = await getUserProfile()
    if (!user) return []

    const where: any = {}

    // Super Admin sees all, others see company tickets
    if (user.role !== 'SUPER_ADMIN') {
        where.tenantId = user.companyId
    }

    if (filter?.status && filter.status !== 'ALL') {
        where.status = filter.status
    }

    return await prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            createdBy: { select: { username: true, email: true } },
            company: { select: { name: true } },
            store: { select: { name: true } },
            assignedTo: { select: { username: true } },
            _count: { select: { messages: true } }
        }
    })
}

// ========== GET ADMIN TICKETS (Super Admin with filters) ==========
export async function getAdminTickets(filters?: {
    status?: TicketStatus
    priority?: TicketPriority
    category?: TicketCategory
    tenantId?: string
    assignedToId?: string
    search?: string
    page?: number
    limit?: number
}) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const skip = (page - 1) * limit

    const where: any = {}
    if (filters?.status) where.status = filters.status
    if (filters?.priority) where.priority = filters.priority
    if (filters?.category) where.category = filters.category
    if (filters?.tenantId) where.tenantId = filters.tenantId
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId
    if (filters?.search) {
        where.OR = [
            { ticketNumber: { contains: filters.search } },
            { subject: { contains: filters.search } }
        ]
    }

    const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
            where,
            include: {
                company: { select: { name: true } },
                store: { select: { name: true } },
                createdBy: { select: { username: true, email: true } },
                assignedTo: { select: { username: true } },
                _count: { select: { messages: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.supportTicket.count({ where })
    ])

    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ========== GET TICKET DETAILS ==========
export async function getTicketDetails(ticketId: string) {
    const user = await getUserProfile()
    if (!user) return null

    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
            company: { select: { name: true, slug: true } },
            store: { select: { name: true } },
            createdBy: { select: { id: true, username: true, email: true, role: true } },
            assignedTo: { select: { id: true, username: true, email: true } },
            messages: {
                include: { sender: { select: { id: true, username: true, role: true } } },
                orderBy: { createdAt: 'asc' }
            },
            logs: { orderBy: { createdAt: 'desc' }, take: 20 },
            attachments: true
        }
    })

    if (!ticket) return null

    // Access control
    const isSuperAdmin = user.role === 'SUPER_ADMIN'
    const isOwner = ticket.tenantId === user.companyId

    if (!isSuperAdmin && !isOwner) {
        throw new Error("Unauthorized access to this ticket")
    }

    return ticket
}

// ========== ADD TICKET MESSAGE ==========
export async function addTicketMessage(ticketId: string, message: string, options?: {
    isInternal?: boolean
    attachments?: string
}) {
    const user = await getUserProfile()
    if (!user) throw new Error("Unauthorized")

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new Error("Ticket not found")

    // Access control
    const isSuperAdmin = user.role === 'SUPER_ADMIN'
    const isOwner = ticket.tenantId === user.companyId

    if (!isSuperAdmin && !isOwner) {
        throw new Error("Unauthorized")
    }

    const newMessage = await prisma.supportMessage.create({
        data: {
            ticketId,
            senderId: user.id,
            message,
            isInternal: options?.isInternal || false,
            attachments: options?.attachments || null
        }
    })

    // Update ticket
    const updates: any = { updatedAt: new Date() }

    // First response tracking
    if (isSuperAdmin && !ticket.firstResponseAt) {
        updates.firstResponseAt = new Date()
    }

    // Status change on reply
    if (isSuperAdmin && ticket.status === 'OPEN') {
        updates.status = 'IN_PROGRESS'
    } else if (isOwner && ticket.status === 'WAITING_FOR_CUSTOMER') {
        updates.status = 'IN_PROGRESS'
    }

    await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updates
    })

    // Log
    await prisma.supportLog.create({
        data: {
            ticketId,
            actorUserId: user.id,
            actorRole: user.role,
            action: 'REPLIED',
            details: options?.isInternal ? 'Internal note' : 'Reply'
        }
    })

    revalidatePath(`/dashboard/support/tickets/${ticketId}`)

    // Notify about reply
    notifyTicketReplied(ticketId, user.id).catch(console.error)

    return newMessage
}

// ========== UPDATE TICKET STATUS ==========
export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        throw new Error("Unauthorized")
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new Error("Ticket not found")

    const updates: any = { status }
    if (status === 'RESOLVED') updates.resolvedAt = new Date()
    if (status === 'CLOSED') updates.closedAt = new Date()

    await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updates
    })

    await prisma.supportLog.create({
        data: {
            ticketId,
            actorUserId: user.id,
            actorRole: user.role,
            action: 'STATUS_CHANGE',
            details: JSON.stringify({ from: ticket.status, to: status })
        }
    })

    await logAudit({
        module: 'SUPPORT',
        action: 'STATUS_UPDATED',
        entityType: 'SupportTicket',
        entityId: ticketId,
        before: { status: ticket.status },
        after: { status }
    })

    revalidatePath('/dashboard/admin/support')

    // Notify about status change
    notifyTicketStatusChanged(ticketId, status).catch(console.error)

    return { success: true }
}

// ========== ASSIGN TICKET ==========
export async function assignTicket(ticketId: string, agentId: string | null) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        throw new Error("Unauthorized")
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new Error("Ticket not found")

    await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { assignedToId: agentId }
    })

    await prisma.supportLog.create({
        data: {
            ticketId,
            actorUserId: user.id,
            actorRole: user.role,
            action: 'ASSIGNED',
            details: agentId ? `Assigned to ${agentId}` : 'Unassigned'
        }
    })

    revalidatePath('/dashboard/admin/support')

    // Notify assigned agent
    if (agentId) {
        notifyTicketAssigned(ticketId, agentId).catch(console.error)
    }

    return { success: true }
}

// ========== DASHBOARD STATS (Super Admin) ==========
export async function getSupportStats() {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const [open, inProgress, waiting, resolved, closed, critical, high] = await Promise.all([
        prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.supportTicket.count({ where: { status: 'WAITING_FOR_CUSTOMER' } }),
        prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
        prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
        prisma.supportTicket.count({ where: { priority: 'CRITICAL', status: { not: 'CLOSED' } } }),
        prisma.supportTicket.count({ where: { priority: 'HIGH', status: { not: 'CLOSED' } } })
    ])

    return {
        open, inProgress, waiting, resolved, closed,
        critical, high,
        activeTickets: open + inProgress + waiting
    }
}

// ========== FAQ FUNCTIONS ==========
export async function getFaqs(category?: string, search?: string) {
    const where: any = { isVisible: true }

    if (category && category !== 'ALL') {
        where.category = category
    }

    if (search) {
        where.OR = [
            { question: { contains: search } },
            { answer: { contains: search } }
        ]
    }

    return await prisma.faqArticle.findMany({
        where,
        orderBy: { sortOrder: 'asc' }
    })
}

export async function seedFaqs() {
    const existing = await prisma.faqArticle.count()
    if (existing > 0) return

    await prisma.faqArticle.createMany({
        data: [
            { category: "Billing", question: "How to correct an invoice after printing?", answer: "Go to Recent Orders, find the order, click Cancel if allowed, then re-create." },
            { category: "GST & Taxes", question: "How are taxes calculated?", answer: "Taxes are applied based on the product settings and global tax configuration." },
            { category: "Inventory", question: "How to add stock?", answer: "Go to Inventory > Stock Entry and add new purchase records." },
            { category: "Login", question: "I forgot my PIN", answer: "Contact your store manager to reset your PIN from the Users section." },
            { category: "Hardware", question: "Printer not working", answer: "Ensure the printer is connected via USB/LAN and the service is running. Check Paper roll." }
        ]
    })
}
