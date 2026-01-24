'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"

// ========== Types ==========
export type SupportNotificationType =
    | 'TICKET_CREATED'
    | 'TICKET_ASSIGNED'
    | 'TICKET_REPLIED'
    | 'TICKET_STATUS_CHANGED'
    | 'TICKET_SLA_BREACH'
    | 'TICKET_SLA_WARNING'

// ========== SLA Breach Detection ==========
export async function checkSLABreaches() {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const now = new Date()

    // Find tickets that are past due
    const breachedTickets = await prisma.supportTicket.findMany({
        where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
            dueAt: { lt: now }
        },
        include: {
            company: { select: { name: true } },
            createdBy: { select: { username: true, email: true } },
            assignedTo: { select: { username: true, email: true } }
        },
        orderBy: { dueAt: 'asc' }
    })

    // Find tickets approaching SLA (within 2 hours)
    const warningThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const warningTickets = await prisma.supportTicket.findMany({
        where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
            dueAt: { gte: now, lt: warningThreshold }
        },
        include: {
            company: { select: { name: true } },
            assignedTo: { select: { username: true } }
        },
        orderBy: { dueAt: 'asc' }
    })

    return { breachedTickets, warningTickets }
}

// ========== Get SLA Summary ==========
export async function getSLASummary() {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const now = new Date()
    const warningThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const [breached, warning, onTrack, resolved] = await Promise.all([
        prisma.supportTicket.count({
            where: {
                status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
                dueAt: { lt: now }
            }
        }),
        prisma.supportTicket.count({
            where: {
                status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
                dueAt: { gte: now, lt: warningThreshold }
            }
        }),
        prisma.supportTicket.count({
            where: {
                status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
                dueAt: { gte: warningThreshold }
            }
        }),
        prisma.supportTicket.count({
            where: {
                status: { in: ['RESOLVED', 'CLOSED'] },
                resolvedAt: { not: null },
                dueAt: { not: null }
            }
        })
    ])

    // Calculate average resolution time for resolved tickets
    const resolvedTicketsWithTimes = await prisma.supportTicket.findMany({
        where: {
            resolvedAt: { not: null }
        },
        select: {
            createdAt: true,
            resolvedAt: true
        },
        take: 100,
        orderBy: { resolvedAt: 'desc' }
    })

    let avgResolutionHours = 0
    if (resolvedTicketsWithTimes.length > 0) {
        const totalMs = resolvedTicketsWithTimes.reduce((sum: number, t: { createdAt: Date, resolvedAt: Date | null }) => {
            return sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime())
        }, 0)
        avgResolutionHours = Math.round(totalMs / resolvedTicketsWithTimes.length / (1000 * 60 * 60))
    }

    return {
        breached,
        warning,
        onTrack,
        resolved,
        avgResolutionHours
    }
}

// ========== Create Support Notification ==========
export async function createSupportNotification(params: {
    ticketId: string
    type: SupportNotificationType
    recipientIds: string[]
    title: string
    message: string
}) {
    // Create notifications for each recipient
    const notifications = params.recipientIds.map(userId => ({
        userId,
        title: params.title,
        message: params.message,
        type: 'SUPPORT',
        isRead: false,
        linkUrl: `/dashboard/support/tickets/${params.ticketId}`,
        metadata: JSON.stringify({
            ticketId: params.ticketId,
            notificationType: params.type
        })
    }))

    await prisma.notification.createMany({
        data: notifications
    })

    return { success: true, count: notifications.length }
}

// ========== Get User Notifications ==========
export async function getUserNotifications(limit = 20) {
    const user = await getUserProfile()
    if (!user) return { error: "Unauthorized" }

    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit
    })

    const unreadCount = await prisma.notification.count({
        where: { userId: user.id, isRead: false }
    })

    return { notifications, unreadCount }
}

// ========== Mark Notification as Read ==========
export async function markNotificationRead(notificationId: string) {
    const user = await getUserProfile()
    if (!user) return { error: "Unauthorized" }

    await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true }
    })

    return { success: true }
}

// ========== Mark All Notifications as Read ==========
export async function markAllNotificationsRead() {
    const user = await getUserProfile()
    if (!user) return { error: "Unauthorized" }

    await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true }
    })

    return { success: true }
}

// ========== Notify on Ticket Events ==========
export async function notifyTicketCreated(ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { createdBy: true }
    })
    if (!ticket) return

    // Notify all super admins
    const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true }
    })

    await createSupportNotification({
        ticketId,
        type: 'TICKET_CREATED',
        recipientIds: superAdmins.map((u: { id: string }) => u.id),
        title: 'New Support Ticket',
        message: `${ticket.createdBy?.username || 'A user'} raised a new ticket: ${ticket.subject}`
    })
}

export async function notifyTicketAssigned(ticketId: string, agentId: string) {
    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
    })
    if (!ticket) return

    await createSupportNotification({
        ticketId,
        type: 'TICKET_ASSIGNED',
        recipientIds: [agentId],
        title: 'Ticket Assigned to You',
        message: `You have been assigned to ticket: ${ticket.subject}`
    })
}

export async function notifyTicketReplied(ticketId: string, senderId: string) {
    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
            createdBy: true,
            assignedTo: true,
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { sender: true }
            }
        }
    })
    if (!ticket) return

    const recipientIds: string[] = []

    // If support replied, notify creator
    if (senderId !== ticket.createdById && ticket.createdById) {
        recipientIds.push(ticket.createdById)
    }

    // If customer replied, notify assignee and super admins
    if (senderId === ticket.createdById) {
        if (ticket.assignedToId) recipientIds.push(ticket.assignedToId)

        const superAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN', isActive: true, id: { not: senderId } },
            select: { id: true }
        })
        recipientIds.push(...superAdmins.map((u: { id: string }) => u.id))
    }

    if (recipientIds.length > 0) {
        const lastMessage = ticket.messages[0]
        await createSupportNotification({
            ticketId,
            type: 'TICKET_REPLIED',
            recipientIds: [...new Set(recipientIds)],
            title: `Reply on ${ticket.ticketNumber}`,
            message: `${lastMessage?.sender?.username || 'Someone'} replied: "${lastMessage?.message?.substring(0, 50)}..."`
        })
    }
}

export async function notifyTicketStatusChanged(ticketId: string, newStatus: string) {
    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { createdBy: true }
    })
    if (!ticket || !ticket.createdById) return

    await createSupportNotification({
        ticketId,
        type: 'TICKET_STATUS_CHANGED',
        recipientIds: [ticket.createdById],
        title: `Ticket ${ticket.ticketNumber} Updated`,
        message: `Your ticket status changed to: ${newStatus.replace(/_/g, ' ')}`
    })
}
