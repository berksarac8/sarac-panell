'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
    >
      Yazdır
    </button>
  )
}
