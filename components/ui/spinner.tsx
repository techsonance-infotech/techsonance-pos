import { cn } from "@/lib/utils"

interface SpinnerProps {
    size?: "sm" | "md" | "lg" | "xl"
    className?: string
}

export function Spinner({ size = "md", className }: SpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-2",
        lg: "h-12 w-12 border-3",
        xl: "h-16 w-16 border-4"
    }

    return (
        <div
            className={cn(
                "animate-spin rounded-full border-gray-300 border-t-blue-600",
                sizeClasses[size],
                className
            )}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    )
}

interface LoadingOverlayProps {
    message?: string
    className?: string
}

export function LoadingOverlay({ message = "Loading...", className }: LoadingOverlayProps) {
    return (
        <div className={cn("fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50", className)}>
            <div className="bg-white rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <p className="text-gray-700 font-medium">{message}</p>
            </div>
        </div>
    )
}

interface ButtonLoaderProps {
    loading?: boolean
    children: React.ReactNode
    className?: string
    disabled?: boolean
    onClick?: () => void
    type?: "button" | "submit" | "reset"
}

export function ButtonWithLoader({
    loading = false,
    children,
    className,
    disabled,
    onClick,
    type = "button"
}: ButtonLoaderProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
                "relative",
                loading && "cursor-wait",
                className
            )}
        >
            <span className={cn(loading && "invisible")}>{children}</span>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner size="sm" className="border-t-white" />
                </div>
            )}
        </button>
    )
}
