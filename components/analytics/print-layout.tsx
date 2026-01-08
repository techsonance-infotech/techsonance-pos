"use client"

import { ReactNode } from 'react'

export interface PrintLayoutProps {
    title: string
    dateRange?: string
    companyName?: string
    storeName?: string
    children: ReactNode
    additionalInfo?: { label: string; value: string }[]
}

export function PrintLayout({
    title,
    dateRange,
    companyName = 'TechSonance POS',
    storeName,
    children,
    additionalInfo = []
}: PrintLayoutProps) {
    return (
        <div className="print-container">
            {/* Print Header - Only visible when printing */}
            <div className="print-only print-header">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
                    {storeName && (
                        <p className="text-sm text-gray-600 mt-1">{storeName}</p>
                    )}
                </div>

                <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                    {dateRange && (
                        <p className="text-sm text-gray-600 mt-1">Period: {dateRange}</p>
                    )}
                </div>

                {additionalInfo.length > 0 && (
                    <div className="mb-4 text-sm">
                        {additionalInfo.map((info, index) => (
                            <div key={index} className="flex justify-between py-1">
                                <span className="font-medium">{info.label}:</span>
                                <span>{info.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                <hr className="border-gray-300 mb-4" />
            </div>

            {/* Main Content */}
            <div className="print-content">
                {children}
            </div>

            {/* Print Footer - Only visible when printing */}
            <div className="print-only print-footer">
                <hr className="border-gray-300 mt-4 mb-2" />
                <div className="flex justify-between text-xs text-gray-600">
                    <span>
                        Generated: {new Date().toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        })}
                    </span>
                    <span>{companyName}</span>
                </div>
            </div>

            <style jsx>{`
        @media print {
          .print-container {
            width: 100%;
            max-width: none;
          }

          .print-header {
            display: block !important;
          }

          .print-footer {
            display: block !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px 20px;
          }

          .print-content {
            margin-bottom: 60px;
          }
        }

        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
        </div>
    )
}
