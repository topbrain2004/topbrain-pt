import { NextResponse } from 'next/server'
import { resetAllData, seedYoonOnyuData, cleanupOrphanedStudents, restoreYoonOnyuAccount } from '@/lib/firestore/debug'

export async function POST(request: Request) {
    try {
        const { action } = await request.json()
        console.log(`[API] Debug action requested: ${action}`)

        if (action === 'reset') {
            await resetAllData()
            return NextResponse.json({ message: '데이터 초기화 완료 (윤온유 제외)' })
        }
        else if (action === 'seed') {
            await seedYoonOnyuData()
            return NextResponse.json({ message: '윤온유 테스트 데이터 생성 완료' })
        }
        else if (action === 'wipe') {
            await resetAllData(undefined, true) // Force delete all
            return NextResponse.json({ message: '모든 데이터 완전 삭제 완료 (윤온유 포함)' })
        }
        else if (action === 'cleanup') {
            await cleanupOrphanedStudents()
            return NextResponse.json({ message: '고아 데이터 정리 완료' })
        }
        else if (action === 'dump_accounts') {
            const { getDocs, collection } = await import('@firebase/firestore')
            const { getDb } = await import('@/lib/firebase')
            const db = getDb()
            if (db) {
                const snap = await getDocs(collection(db, 'accounts'))
                const accounts = snap.docs.map(d => ({ id: d.id, email: d.data().email, name: d.data().displayName }))
                console.log('[Debug] === ACCOUNT DUMP ===')
                accounts.forEach(a => console.log(`ID: ${a.id} | Email: "${a.email}" | Name: "${a.name}"`))
                console.log('[Debug] ======================')
                return NextResponse.json({ count: accounts.length, accounts })
            }
            return NextResponse.json({ error: 'DB not ready' })
        }
        else if (action === 'migrate_emails') {
            const { getDocs, collection, updateDoc, doc } = await import('@firebase/firestore')
            const { getDb } = await import('@/lib/firebase')
            const db = getDb()
            if (db) {
                const snap = await getDocs(collection(db, 'accounts'))
                let updatedCount = 0
                const updates = []

                for (const d of snap.docs) {
                    const data = d.data()
                    const email = data.email || ""
                    if (!email.includes("@")) {
                        const newEmail = `${email}@literacy.app`
                        console.log(`[Migrate] Fixing email for ${data.displayName}: ${email} -> ${newEmail}`)
                        await updateDoc(doc(db, 'accounts', d.id), { email: newEmail })
                        updates.push({ id: d.id, old: email, new: newEmail })
                        updatedCount++
                    }
                }
                return NextResponse.json({ message: `Migrated ${updatedCount} accounts`, updates })
            }
            return NextResponse.json({ message: `Migrated ${updatedCount} accounts`, updates })
        }
        else if (action === 'dump_textbooks') {
            const { getDocs, collection } = await import('@firebase/firestore')
            const { getDb } = await import('@/lib/firebase')
            const db = getDb()
            if (db) {
                const snap = await getDocs(collection(db, 'textbooks'))
                const textbooks = snap.docs.map(d => {
                    const data = d.data()
                    return {
                        id: d.id,
                        name: data.name,
                        subUnits: data.subUnits
                    }
                })

                // Log simplified structure
                console.log('[Debug] === TEXTBOOK DUMP ===')
                textbooks.forEach(t => {
                    console.log(`Textbook: ${t.name} (${t.id})`)
                    if (t.subUnits) {
                        Object.keys(t.subUnits).forEach(k => {
                            const probs = t.subUnits[k].problems || []
                            console.log(`  SubUnit: ${k} - Problems: ${probs.length}`)
                            probs.forEach((p: any) => console.log(`    Q${p.number}: type="${p.type}"`))
                        })
                    }
                })
                console.log('[Debug] ======================')
                return NextResponse.json({ count: textbooks.length, sample: textbooks.slice(0, 3) })
            }
            return NextResponse.json({ error: 'DB not ready' })
        }
        else if (action === 'restore') {
            await restoreYoonOnyuAccount()
            return NextResponse.json({ message: '윤온유 계정 복구 완료 (ID: 윤온유)' })
        }
        else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

    } catch (error) {
        console.error(`[API] Debug action failed:`, error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
