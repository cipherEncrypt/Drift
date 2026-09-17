import { CITIES } from '../lib/cities'

interface Props {
  value: string
  onChange: (slug: string) => void
  optional?: boolean
}

export default function CitySelect({ value, onChange, optional }: Props) {
  return (
    <label className="field">
      <span>Home city</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {optional && <option value="">Skip for now</option>}
        {CITIES.map((city) => (
          <option key={city.slug} value={city.slug}>
            {city.name}
          </option>
        ))}
      </select>
    </label>
  )
}
