// CSV 파싱 및 데이터 변환 유틸리티
import type { CSVProblemRow, Textbook, Problem } from "./firestore/types"

// CSV 헤더 매핑
const CSV_HEADER_MAP: Record<string, keyof CSVProblemRow> = {
  큰_범주_단계: "majorCategory",
  작은_범주_단계: "minorCategory",
  유형: "category",
  문제집_이름: "textbookName",
  대단원명: "majorUnit",
  소단원명: "subUnit",
  페이지수: "page",
  지문ID: "passageId",
  문제번호: "problemNumber",
  문제유형: "problemType",
  정답: "answer",
  권장학년: "recommendedGrade",
  사고유형: "domain",
  영역: "domain",
  활성여부: "isActive",
}

// 문제유형 매핑
const PROBLEM_TYPE_MAP: Record<string, "multiple" | "short" | "essay"> = {
  객관식: "multiple",
  주관식: "short",
  서술형: "essay",
  선택형: "multiple",
  단답형: "short",
}

export function parseCSV(csvText: string): CSVProblemRow[] {
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) return []

  // 헤더 파싱
  const headers = lines[0].split(",").map((h) => h.trim())
  const mappedHeaders = headers.map((h) => CSV_HEADER_MAP[h] || h)

  // 데이터 행 파싱
  const rows: CSVProblemRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue

    const row: Partial<CSVProblemRow> = {}
    mappedHeaders.forEach((header, index) => {
      const value = values[index]?.trim() || ""

      if (header === "page" || header === "problemNumber") {
        ; (row as any)[header] = Number.parseInt(value) || 0
      } else if (header === "isActive") {
        ; (row as any)[header] = value === "Y" || value === "true" || value === "1"
      } else {
        ; (row as any)[header] = value
      }
    })

    if (row.textbookName) {
      rows.push(row as CSVProblemRow)
    }
  }

  return rows
}

// CSV 라인 파싱 (쉼표 내 따옴표 처리)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

// CSV 데이터를 Textbook 구조로 변환
export function convertCSVToTextbooks(rows: CSVProblemRow[]): Partial<Textbook>[] {
  const textbookMap = new Map<string, Partial<Textbook>>()

  for (const row of rows) {
    const textbookKey = row.textbookName

    if (!textbookMap.has(textbookKey)) {
      textbookMap.set(textbookKey, {
        title: row.textbookName,
        majorCategory: row.majorCategory,
        minorCategory: row.minorCategory,
        category: row.category,
        majorUnit: row.majorUnit,
        recommendedGrade: row.recommendedGrade,
        isActive: row.isActive,
        subUnits: [],
        problems: [],
        totalProblems: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    const textbook = textbookMap.get(textbookKey)!

    // 소단원 찾기 또는 생성
    let subUnit = textbook.subUnits?.find((su) => su.name === row.subUnit)
    if (!subUnit && row.subUnit) {
      subUnit = {
        id: `${textbookKey}-${row.subUnit}`.replace(/\s/g, "-"),
        name: row.subUnit,
        page: row.page,
        problems: [],
      }
      textbook.subUnits?.push(subUnit)
    }

    // 문제 유형 자동 감지 (명시된 유형이 없으면 정답 형태를 보고 판단)
    let pType = PROBLEM_TYPE_MAP[row.problemType]
    if (!pType) {
      // 정답이 숫자 1~5 중 하나라면 객관식으로 간주
      if (/^[1-5]$/.test(row.answer.trim())) {
        pType = "multiple"
      } else {
        // 그 외에는 주관식으로 간주
        pType = "short"
      }
    }

    // 문제 생성
    const problem: Problem = {
      number: row.problemNumber,
      question: "",
      options: [],
      correctAnswer: row.answer,
      type: pType,
      passageId: row.passageId,
      domain: row.domain,
      isActive: row.isActive,
    }

    if (subUnit) {
      subUnit.problems.push(problem)
    } else {
      textbook.problems?.push(problem)
    }

    textbook.totalProblems = (textbook.totalProblems || 0) + 1
  }

  return Array.from(textbookMap.values())
}

// Textbook을 CSV 문자열로 변환 (내보내기용)
export function convertTextbooksToCSV(textbooks: Textbook[]): string {
  const headers = Object.keys(CSV_HEADER_MAP).join(",")
  const rows: string[] = [headers]

  for (const textbook of textbooks) {
    if (textbook.subUnits) {
      for (const subUnit of textbook.subUnits) {
        for (const problem of subUnit.problems) {
          rows.push(
            [
              textbook.majorCategory || "",
              textbook.minorCategory || "",
              textbook.category || "",
              textbook.title,
              textbook.majorUnit || "",
              subUnit.name,
              subUnit.page.toString(),
              problem.passageId || "",
              problem.number.toString(),
              problem.type === "multiple" ? "객관식" : problem.type === "short" ? "주관식" : "서술형",
              problem.correctAnswer,
              textbook.recommendedGrade || "",
              problem.domain || "",
              problem.isActive !== false ? "Y" : "N",
            ].join(","),
          )
        }
      }
    }
  }

  return rows.join("\n")
}

// CSV 템플릿 생성
export function generateCSVTemplate(): string {
  const headers = Object.keys(CSV_HEADER_MAP).join(",")
  const sampleRow = [
    "초등",
    "3단계",
    "독해",
    "문해력PT 초등 3단계",
    "1. 문장의 이해",
    "1-1. 주어와 서술어",
    "10",
    "P001",
    "1",
    "객관식",
    "3",
    "초3",
    "이해력",
    "Y",
  ].join(",")

  return `${headers}\n${sampleRow}`
}
