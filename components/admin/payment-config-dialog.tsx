"use client"

import { useState, useEffect } from "react"
import { getPaymentConfig, savePaymentConfig } from "@/app/actions/payment-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings, Loader2, Save, CreditCard, Building, QrCode } from "lucide-react"
import { toast } from "sonner"

// Define type locally since we can't import from server action file
type PaymentConfig = {
    bankName: string
    accountName: string
    accountNumber: string
    ifscCode: string
    upiId: string
}

export function PaymentConfigDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<PaymentConfig>({
        bankName: '',
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: ''
    })

    useEffect(() => {
        if (open) {
            loadConfig()
        }
    }, [open])

    const loadConfig = async () => {
        setLoading(true)
        const data = await getPaymentConfig()
        setConfig(data)
        setLoading(false)
    }

    const handleSave = async () => {
        setSaving(true)
        const result = await savePaymentConfig(config)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Payment details saved!")
            setOpen(false)
        }
        setSaving(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Configure Payment Details
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-orange-500" />
                        Payment Configuration
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Bank Details */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Building className="h-4 w-4" />
                                Bank Details
                            </div>

                            <div className="grid gap-3">
                                <div>
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Input
                                        id="bankName"
                                        placeholder="e.g., HDFC Bank"
                                        value={config.bankName}
                                        onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="accountName">Account Holder Name</Label>
                                    <Input
                                        id="accountName"
                                        placeholder="e.g., TechSonance InfoTech LLP"
                                        value={config.accountName}
                                        onChange={(e) => setConfig({ ...config, accountName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="accountNumber">Account Number</Label>
                                    <Input
                                        id="accountNumber"
                                        placeholder="e.g., 1234567890"
                                        value={config.accountNumber}
                                        onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="ifscCode">IFSC Code</Label>
                                    <Input
                                        id="ifscCode"
                                        placeholder="e.g., HDFC0001234"
                                        value={config.ifscCode}
                                        onChange={(e) => setConfig({ ...config, ifscCode: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* UPI Details */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <QrCode className="h-4 w-4" />
                                UPI Details
                            </div>

                            <div>
                                <Label htmlFor="upiId">UPI ID</Label>
                                <Input
                                    id="upiId"
                                    placeholder="e.g., business@upi"
                                    value={config.upiId}
                                    onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-orange-500 hover:bg-orange-600"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Payment Details
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
