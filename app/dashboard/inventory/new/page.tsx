import { IngredientForm } from "@/components/inventory/ingredient-form"

export default function NewIngredientPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Add Ingredient</h2>
            </div>
            <div className="grid gap-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <IngredientForm />
                </div>
            </div>
        </div>
    )
}
