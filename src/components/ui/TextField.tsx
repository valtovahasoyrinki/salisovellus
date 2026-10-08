import { useId, type InputHTMLAttributes } from 'react'

/**
 * Tekstikenttä labelilla ja valinnaisella virhetekstillä.
 * Kosketusalue ≥ 48 px, fokus näkyy selvästi myös salin valaistuksessa.
 */
export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  label: string
  /** Virhe korvaa vihjeen ja värittää reunan – punainen vain virheessä. */
  error?: string
  hint?: string
  className?: string
}

export function TextField({ label, error, hint, className = '', ...rest }: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-msg`
  const message = error ?? hint

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`min-h-12 w-full rounded-xl border bg-surface-2 px-3 text-text outline-none ${
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
