import { router } from '../trpc'
import { santriRouter } from './santri'
import { billingRouter } from './billing'
import { kamarRouter, kelasRouter } from './kamar-kelas'
import { attendanceRouter } from './attendance'
import { linkRouter } from './link'
import { userRouter } from './user'
import { billingModelRouter } from './billing-model'
import { paymentProofRouter } from './payment-proof'
import { academicRouter } from './academic'
import { invoiceRouter } from './invoice'
import { paymentRouter } from './payment'
import { dormRouter } from './dorm'
import { permissionsRouter } from './permissions'
import { inviteRouter } from './invite'
import { authRouter } from './auth'
import { roleRequestRouter } from './role-request'
import { settingsRouter } from './settings'
import { santriRequestRouter } from './santri-request'
import { sectionMemberRouter } from './section-member'
import { santriUploadRouter } from './santri-upload'

export const appRouter = router({
    santri: santriRouter,
    billing: billingRouter,
    billingModel: billingModelRouter,
    paymentProof: paymentProofRouter,
    kamar: kamarRouter,
    kelas: kelasRouter,
    attendance: attendanceRouter,
    link: linkRouter,
    user: userRouter,
    academic: academicRouter,
    invoice: invoiceRouter,
    payment: paymentRouter,
    dorm: dormRouter,
    permissions: permissionsRouter,
    invite: inviteRouter,
    auth: authRouter,
    roleRequest: roleRequestRouter,
    settings: settingsRouter,
    santriRequest: santriRequestRouter,
    sectionMember: sectionMemberRouter,
    santriUpload: santriUploadRouter,
})

export type AppRouter = typeof appRouter

