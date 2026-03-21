import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

interface TruncatedTextProps {
  text: string
  className?: string
  /** Tag to render. Defaults to 'span'. */
  as?: 'span' | 'p' | 'div'
  /** Tooltip placement. Defaults to 'top'. */
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Renders text with `truncate` (overflow ellipsis) and automatically shows a
 * tooltip with the full string when the content is actually clipped.
 * The tooltip is suppressed when the text fits without truncation.
 */
export function TruncatedText({
  text,
  className,
  as: Tag = 'span',
  side = 'top',
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = Tag as any

  return (
    <TooltipProvider delayDuration={400}>
      {/* open={false} when not truncated so hover does nothing */}
      <Tooltip open={isTruncated ? undefined : false}>
        <TooltipTrigger asChild>
          <C ref={ref} className={cn('truncate', className)}>
            {text}
          </C>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-64 break-words text-xs leading-snug">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
