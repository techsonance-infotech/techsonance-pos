import { SupplierForm } from "@/components/inventory/supplier-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewSupplierPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-4 mb-6">
                <Link href="/dashboard/inventory/suppliers">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Add Supplier</h2>
            </div>

            <div className="grid gap-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6 max-w-2xl">
                    <SupplierForm />
                </div>
            </div>
        </div>
    )
}
