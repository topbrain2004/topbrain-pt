
import { NextResponse } from 'next/server'
import { cleanupOrphanedStudents } from '@/lib/firestore/debug'

export async function GET() {
    try {
        await cleanupOrphanedStudents()
        return NextResponse.json({ message: 'Orphan cleanup success' })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
