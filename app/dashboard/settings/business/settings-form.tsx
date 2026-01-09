"use client"

import { useState } from "react"
import { updateBusinessSettings, uploadLogo } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Upload, Building, Phone, Mail, FileText, MapPin } from "lucide-react"
import Image from "next/image"

type Settings = {
    businessName: string
    logoUrl: string
    address: string
    phone: string
    email: string
    gstNo?: string
    companyId?: string | null
    slug?: string
}

export function SettingsForm({ initialSettings, hasCompany = false }: { initialSettings: Settings; hasCompany?: boolean }) {
    const [loading, setLoading] = useState(false)
    const [logoLoading, setLogoLoading] = useState(false)
    const [logoPreview, setLogoPreview] = useState(initialSettings.logoUrl)

    async function handleUpdate(formData: FormData) {
        setLoading(true)
        try {
            const result = await updateBusinessSettings(null, formData)
            if (result.success) {
                toast.success("Settings updated successfully")
            } else {
                toast.error("Failed to update settings")
            }
        } catch (e) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return

        setLogoLoading(true)
        const formData = new FormData()
        formData.append('logo', e.target.files[0])

        try {
            const result = await uploadLogo(formData)
            if (result.success) {
                toast.success("Logo uploaded successfully")
                setLogoPreview(result.url!)
            } else {
                toast.error("Failed to upload logo")
            }
        } catch (e) {
            toast.error("Logo upload error")
        } finally {
            setLogoLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Logo Section */}
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Business Logo</CardTitle>
                    <CardDescription>Upload your business logo. This will be displayed on the sidebar and receipts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-6">
                        <div className="h-24 w-24 relative rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shadow-sm">
                            {logoPreview ? (
                                <Image
                                    src={logoPreview}
                                    alt="Logo"
                                    fill
                                    className="object-contain p-2"
                                />
                            ) : (
                                <Building className="h-8 w-8 text-gray-300" />
                            )}
                        </div>
                        <div className="flex-1">
                            <Label htmlFor="logo-upload" className="cursor-pointer">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all w-fit">
                                    {logoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    <span className="text-sm font-medium">Upload New Logo</span>
                                </div>
                                <input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                    disabled={logoLoading}
                                />
                            </Label>
                            <p className="text-xs text-gray-500 mt-2">Recommended size: 200x200px. Max size: 2MB.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* General Details Form */}
            <form action={handleUpdate}>
                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>Update your core business details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Business Name</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    name="businessName"
                                    defaultValue={initialSettings.businessName}
                                    className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all duration-200"
                                    placeholder="e.g. Cafe TechSonance"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Contact Phone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        name="phone"
                                        defaultValue={initialSettings.phone}
                                        className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all duration-200"
                                        placeholder="+91..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        name="email"
                                        defaultValue={initialSettings.email}
                                        className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all duration-200"
                                        placeholder="contact@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>GST / Tax ID</Label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    name="gstNo"
                                    defaultValue={initialSettings.gstNo}
                                    className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all duration-200"
                                    placeholder="GSTIN..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    name="address"
                                    defaultValue={initialSettings.address}
                                    className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all duration-200"
                                    placeholder="Full business address..."
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50/50 px-6 py-4 flex justify-end rounded-b-xl">
                        <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}
