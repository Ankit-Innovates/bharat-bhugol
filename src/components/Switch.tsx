import styles from './Switch.module.css'

interface SwitchProps {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

/** A real checkbox inside its label, drawn as an on/off switch. */
export default function Switch({
  label,
  checked,
  disabled = false,
  onChange,
}: Readonly<SwitchProps>) {
  return (
    <label className={styles.switch}>
      <span>{label}</span>
      <input
        className={styles.input}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className={styles.track} aria-hidden="true" />
    </label>
  )
}
