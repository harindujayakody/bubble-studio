"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Notifications, Canva style: a dark card in the bottom-right corner (bottom of the screen on
 * phones), a coloured icon for the kind of message, and a close button. The card is dark in
 * both themes so it reads over the workspace and the post alike.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      offset={20}
      mobileOffset={12}
      gap={10}
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[18px] text-[#3ee0a1]" />,
        info: <InfoIcon className="size-[18px] text-[#b48cff]" />,
        warning: <TriangleAlertIcon className="size-[18px] text-[#ffc83d]" />,
        error: <OctagonXIcon className="size-[18px] text-[#ff6b6b]" />,
        loading: <Loader2Icon className="size-[18px] animate-spin text-[#5fe4e9]" />,
      }}
      style={
        {
          "--normal-bg": "var(--toast)",
          "--normal-text": "#ffffff",
          "--normal-border": "var(--toast-rule)",
          "--border-radius": "12px",
          "--width": "360px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast app-toast",
          title: "app-toast-title",
          description: "app-toast-description",
          icon: "app-toast-icon",
          closeButton: "app-toast-close",
          actionButton: "app-toast-action",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
