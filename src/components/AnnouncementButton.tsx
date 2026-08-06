'use client'

import { useAnnouncements } from '@/components/AnnouncementModal'
import { useLang } from '@/hooks/useLang'

export default function AnnouncementButton({ style }: { style?: React.CSSProperties }) {
  const { open } = useAnnouncements()
  const { t } = useLang()
  return (
    <button onClick={open} style={style}>
      {t.announcementsTitle}
    </button>
  )
}
