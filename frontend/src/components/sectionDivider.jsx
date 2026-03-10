export default function SectionDivider({ className = "" }) {
    return (
      <div className={`w-full ${className}`}>
        <hr className="border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>
    )
  }
  