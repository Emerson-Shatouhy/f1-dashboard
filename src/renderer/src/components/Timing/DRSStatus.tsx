interface DRSStatusProps {
  DRS: boolean
}

export function DRSStatus({ DRS }: DRSStatusProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-md font-bold ${DRS ? 'text-green-500' : 'text-red-500'}`}>
        {DRS ? 'DRS Active' : 'DRS Inactive'}
      </span>
    </div>
  )
}
