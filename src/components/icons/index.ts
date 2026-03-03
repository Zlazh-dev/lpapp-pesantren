import { createElement, type ComponentType } from 'react'
import {
    UilAngleDoubleLeft,
    UilBookOpen,
    UilBoltAlt,
    UilCalendarAlt,
    UilChartBar,
    UilCheckCircle,
    UilDownloadAlt,
    UilEdit,
    UilEstate,
    UilExclamationTriangle,
    UilEye,
    UilEyeSlash,
    UilFileAlt,
    UilFilter,
    UilGraduationCap,
    UilHome,
    UilInfoCircle,
    UilInvoice,
    UilLink,
    UilLock,
    UilLockOpenAlt,
    UilMapPin,
    UilMoneyBill,
    UilPlus,
    UilQrcodeScan,
    UilReceipt,
    UilSave,
    UilSearch,
    UilShieldCheck,
    UilSignOutAlt,
    UilSync,
    UilTimes,
    UilTimesCircle,
    UilTrashAlt,
    UilUploadAlt,
    UilUserCircle,
    UilUsersAlt,
} from '@iconscout/react-unicons'

type UniconProps = {
    size?: number | string
    className?: string
    color?: string
}

type UniconComponent = ComponentType<UniconProps>

export const AppIcons = {
    dashboard: UilEstate,
    beranda: UilEstate,
    masterData: UilBookOpen,
    keuangan: UilMoneyBill,
    akademikMenu: UilGraduationCap,
    userManagement: UilUserCircle,
    pengaturan: UilBoltAlt,
    manageSantri: UilUsersAlt,
    manageKamar: UilHome,
    dataSantri: UilUsersAlt,
    manageKelas: UilGraduationCap,
    manageUsers: UilUserCircle,
    manageRoles: UilShieldCheck,
    pageAccess: UilLock,
    resetPassword: UilLockOpenAlt,
    inviteLinks: UilLink,
    settings: UilBoltAlt,
    santri: UilUsersAlt,
    scan: UilQrcodeScan,
    billing: UilInvoice,
    billingModels: UilFileAlt,
    billingRekap: UilChartBar,
    kamar: UilHome,
    kelas: UilGraduationCap,
    akademik: UilBookOpen,
    adminUsers: UilUserCircle,
    permissions: UilShieldCheck,
    add: UilPlus,
    edit: UilEdit,
    delete: UilTrashAlt,
    search: UilSearch,
    filter: UilFilter,
    download: UilDownloadAlt,
    upload: UilUploadAlt,
    link: UilLink,
    qr: UilQrcodeScan,
    save: UilSave,
    close: UilTimes,
    eye: UilEye,
    eyeOff: UilEyeSlash,
    active: UilCheckCircle,
    inactive: UilTimesCircle,
    warning: UilExclamationTriangle,
    info: UilInfoCircle,
    room: UilHome,
    money: UilMoneyBill,
    receipt: UilReceipt,
    logout: UilSignOutAlt,
    collapse: UilAngleDoubleLeft,
    user: UilUserCircle,
    location: UilMapPin,
    refresh: UilSync,
    calendar: UilCalendarAlt,
    flash: UilBoltAlt,
    locked: UilLock,
    unlocked: UilLockOpenAlt,
} as const satisfies Record<string, UniconComponent>

export type AppIconName = keyof typeof AppIcons

type IconProps = {
    name: AppIconName
    size?: number
    className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
    const AppIcon = AppIcons[name]
    return createElement(AppIcon, { size, className })
}
