import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          flex min-h-[80px] w-full rounded-md border border-gray-700 
          bg-gray-900/50 px-3 py-2 text-sm text-white
          placeholder:text-gray-500 
          focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-blue-500 focus-visible:ring-offset-2 
          focus-visible:ring-offset-gray-950
          disabled:cursor-not-allowed disabled:opacity-50
          resize-none
          ${className}
        `.trim()}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }