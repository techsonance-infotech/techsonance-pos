'use client'

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// ... imports ...
import { ChefHat, ShoppingCart } from "lucide-react"
import { FeedbackForm } from "./feedback-form"

// Mock Menu for MVP (Ideally fetch from API)
const MENU = [
    { id: 1, name: "Butter Chicken", price: 350 },
    { id: 2, name: "Garlic Naan", price: 40 },
    { id: 3, name: "Paneer Tikka", price: 280 },
    { id: 4, name: "Coke", price: 60 }
]

export default function QROrderPage() {
    const searchParams = useSearchParams()
    const tableId = searchParams.get('tableId')
    // Token validation would happen in Middleware or here in useEffect

    const [cart, setCart] = useState<any[]>([])
    const [orderPlaced, setOrderPlaced] = useState(false)

    const addToCart = (item: any) => {
        setCart([...cart, item])
    }

    const placeOrder = () => {
        // Call Server Action to Place Order via KDS (Simulated)
        setOrderPlaced(true)
    }

    // ... inside component ...

    const handleFeedbackSubmit = async (rating: number, comment: string) => {
        // In a real app, call server action here: await submitFeedback({ tableId, rating, comment })
        console.log("Feedback:", { rating, comment })
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network
    }

    if (orderPlaced) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-4 text-center space-y-6">
                <div>
                    <ChefHat className="w-16 h-16 text-green-600 mb-4 mx-auto" />
                    <h1 className="text-2xl font-bold text-green-800">Order Sent to Kitchen!</h1>
                    <p className="text-green-600">Sit tight, your food is being prepared.</p>
                </div>

                <FeedbackForm
                    orderId="mock-order-id"
                    onSkip={() => setOrderPlaced(false)}
                    onSubmit={handleFeedbackSubmit}
                />

                <Button variant="link" onClick={() => setOrderPlaced(false)} className="text-green-700">
                    Order More Items
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white p-4 sticky top-0 shadow-sm z-10 flex justify-between items-center">
                <h1 className="font-bold text-lg">SyncServe Menu</h1>
                <div className="relative">
                    <ShoppingCart className="w-6 h-6 text-slate-700" />
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {cart.length}
                        </span>
                    )}
                </div>
            </header>

            <div className="p-4 space-y-4">
                {MENU.map(item => (
                    <Card key={item.id} className="flex items-center p-4 justify-between">
                        <div>
                            <div className="font-bold">{item.name}</div>
                            <div className="text-slate-500">₹{item.price}</div>
                        </div>
                        <Button size="sm" onClick={() => addToCart(item)}>Add</Button>
                    </Card>
                ))}
            </div>

            {cart.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4">
                    <Button className="w-full h-12 text-lg shadow-xl" onClick={placeOrder}>
                        Place Order • ₹{cart.reduce((a, b) => a + b.price, 0)}
                    </Button>
                </div>
            )}
        </div>
    )
}
