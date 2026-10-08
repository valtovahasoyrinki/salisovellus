import { useId, type TextareaHTMLAttributes } from 'react'

/** Monirivinen kenttä: liikkeen ja treenin muistiinpanot (SPEC §6.3). */
export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'id'> {
  label: string
  error?: string
  hint?: string
  className?: string
}

export function TextArea({ label, error, hint, rows = 3, className = '', ...rest }: TextAreaProps) {
  const id = useId()
  const messageId = `${id}-msg`
  const message = error ?? hint

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`w-full resize-none rounded-xl border bg-surface-2 px-3 py-2.5 leading-relaxed text-text outline-none ${
          error ? 'border-danger' : 'border-border focus-visible:border-border-strong'
        }`}
        {...rest}
      />
      {message ? (
        <p id={messageId} className={`text-xs ${error ? 'text-danger' : 'text-muted'}`} role={error ? 'alert' : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
