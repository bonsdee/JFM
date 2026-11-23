import { Camera, Copy, CreditCard, FileText, Globe, Image, Layers, Mail, Printer, Scissors, Shirt, Sticker } from 'lucide-react'

/** Maps the icon name stored on a service to a Lucide component. */
export const SERVICE_ICON = { Camera, Copy, CreditCard, FileText, Globe, Image, Layers, Mail, Printer, Scissors, Shirt, Sticker }

export const iconFor = (name) => SERVICE_ICON[name] || Printer
