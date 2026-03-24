import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDAE3F3' }, // light blue
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Malgun Gothic',
  size: 11,
  bold: true,
};

// 점검기준 데이터 타입
type CriteriaData = [string, [string, string][]][];

@Injectable()
export class ExcelService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── 기존 월간 리포트 (유지) ── */
  async generateMonthlyReport(year: number, month: number): Promise<Buffer> {
    const events = await this.prisma.changeEvent.findMany({
      where: {
        status: 'APPROVED',
        createdAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
        deletedAt: null,
      },
      include: {
        company: true, manager: true, executive: true, reviewer: true,
        inspectionResults: { include: { item: true } },
        tags: { include: { item: { include: { category: { include: { class: true, parent: true } } } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const masterSheet = workbook.addWorksheet('01_MasterList');
    masterSheet.columns = [
      { header: '접수월', key: 'receiptMonth', width: 10 },
      { header: '발생일', key: 'occurredDate', width: 12 },
      { header: '고객사', key: 'customer', width: 15 },
      { header: '프로젝트', key: 'project', width: 15 },
      { header: '제품군', key: 'productLine', width: 15 },
      { header: '부품번호', key: 'partNumber', width: 15 },
      { header: '공장', key: 'factory', width: 10 },
      { header: '라인', key: 'productionLine', width: 10 },
      { header: '협력사', key: 'companyName', width: 15 },
      { header: '주 분류', key: 'primaryClass', width: 15 },
      { header: '주 카테고리', key: 'primaryCategory', width: 15 },
      { header: '주 항목', key: 'primaryItem', width: 15 },
      { header: '96구분', key: 'cp96Class', width: 15 },
      { header: '96대분류', key: 'cp96Category', width: 15 },
      { header: '96세부항목', key: 'cp96Items', width: 30 },
      { header: '변경내용', key: 'description', width: 30 },
      { header: '발생부서', key: 'department', width: 15 },
      { header: '실무담당자', key: 'managerName', width: 12 },
      { header: '전담중역', key: 'executiveName', width: 12 },
      { header: '상태', key: 'status', width: 10 },
    ];

    events.forEach((event) => {
      const primaryTag = event.tags.find(tag => tag.tagType === 'PRIMARY');
      const primaryItem = primaryTag?.item;
      const primaryCategory = primaryItem?.category;
      const primaryClass = primaryCategory?.class;
      const cp96Tags = event.tags.filter(tag => tag.tagType === 'TAG' && tag.item.category.class.code === 'CP_96');
      const cp96Items = cp96Tags.reduce((acc, tag) => {
        const category = tag.item.category;
        const topCategory = category.parent || category;
        if (!acc[topCategory.name]) acc[topCategory.name] = [];
        acc[topCategory.name].push(tag.item.name);
        return acc;
      }, {} as Record<string, string[]>);

      masterSheet.addRow({
        receiptMonth: event.receiptMonth,
        occurredDate: event.occurredDate.toISOString().split('T')[0],
        customer: event.customer, project: event.project, productLine: event.productLine,
        partNumber: event.partNumber, factory: event.factory, productionLine: event.productionLine,
        companyName: event.company.name,
        primaryClass: primaryClass?.name || '', primaryCategory: primaryCategory?.name || '',
        primaryItem: primaryItem?.name || '',
        cp96Class: Object.keys(cp96Items)[0] || '',
        cp96Category: Object.keys(cp96Items).join('; '),
        cp96Items: Object.values(cp96Items).flat().join('; '),
        description: event.description, department: event.department,
        managerName: event.manager.name, executiveName: event.executive?.name || '',
        status: event.status,
      });
    });

    const codeSheet = workbook.addWorksheet('99_Code');
    codeSheet.columns = [
      { header: '분류', key: 'class', width: 15 }, { header: '대분류', key: 'category', width: 15 },
      { header: '세부항목', key: 'item', width: 30 }, { header: '코드', key: 'code', width: 15 },
      { header: '명칭', key: 'name', width: 30 },
    ];
    const classes = await this.prisma.changeClass.findMany({
      where: { deletedAt: null },
      include: { categories: { where: { deletedAt: null }, include: { items: { where: { deletedAt: null } } } } },
    });
    classes.forEach(cls => cls.categories.forEach(cat => cat.items.forEach(item => {
      codeSheet.addRow({ class: cls.name, category: cat.name, item: item.name, code: item.code, name: item.name });
    })));

    const resultSheet = workbook.addWorksheet('98_InspectionResult');
    resultSheet.columns = [
      { header: '변동점 ID', key: 'eventId', width: 15 },
      { header: '점검항목', key: 'itemName', width: 30 },
      { header: '결과', key: 'value', width: 30 },
    ];
    events.forEach(event => event.inspectionResults.forEach(result => {
      resultSheet.addRow({ eventId: event.id, itemName: result.item.question, value: result.value });
    }));

    [masterSheet, codeSheet, resultSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      sheet.eachRow(row => row.eachCell(cell => { cell.border = THIN_BORDER; }));
    });

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /* ── 변동점 담당제 점검결과 (템플릿 양식) ── */
  async generateInspectionReport(
    year: number, month: number, companyId?: string, userId?: string,
    filters?: { dateFrom?: string; dateTo?: string; status?: string; customer?: string },
  ): Promise<Buffer> {
    // 이벤트 조회 (필터 적용)
    const where: any = { deletedAt: null };

    // 날짜 필터: dateFrom/dateTo가 있으면 사용, 없으면 전체 조회
    if (filters?.dateFrom || filters?.dateTo) {
      where.occurredDate = {};
      if (filters.dateFrom) where.occurredDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.occurredDate.lte = new Date(filters.dateTo + 'T23:59:59');
    }
    // dateFrom/dateTo 없으면 날짜 제한 없이 전체 조회

    if (companyId) where.companyId = companyId;
    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters?.customer && filters.customer !== 'ALL') where.customer = filters.customer;

    const events = await this.prisma.changeEvent.findMany({
      where,
      include: {
        company: true,
        manager: true,
        executive: true,
        primaryItem: { include: { category: { include: { class: true } } } },
      },
      orderBy: { occurredDate: 'asc' },
    });

    // 협력사 정보: 로그인 사용자의 소속 회사 또는 1차사 정보
    let companyCode = '';
    let companyName = '';
    let executiveName = '';
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { company: true } });
      if (user) {
        executiveName = user.name;
        if (user.company) {
          companyCode = user.company.code;
          companyName = user.company.name;
        }
      }
    }
    // 회사 정보가 없으면 1차사(TIER1) 조회
    if (!companyName) {
      const tier1 = await this.prisma.company.findFirst({ where: { type: 'TIER1', deletedAt: null } });
      if (tier1) { companyCode = tier1.code; companyName = tier1.name; }
    }

    // 점검기준 데이터를 DB에서 조회 (NON_FOUR_M 분류의 카테고리/항목)
    const nonFourMClass = await this.prisma.changeClass.findFirst({ where: { code: 'NON_FOUR_M', deletedAt: null } });
    const criteriaData: CriteriaData = [];
    if (nonFourMClass) {
      const categories = await this.prisma.changeCategory.findMany({
        where: { classId: nonFourMClass.id, deletedAt: null, isActive: true },
        include: { items: { where: { deletedAt: null, isActive: true }, orderBy: { code: 'asc' } } },
        orderBy: { code: 'asc' },
      });
      for (const cat of categories) {
        if (cat.items.length === 0) continue;
        criteriaData.push([cat.name, cat.items.map(item => [item.name, item.description || ''] as [string, string])]);
      }
    }

    const monthStr = String(month).padStart(2, '0');
    const workbook = new ExcelJS.Workbook();

    // ===== Sheet 1: 점검기준 =====
    this.buildCriteriaSheet(workbook, criteriaData);

    // 발생항목 드롭다운 = 점검기준 항목명 리스트
    const itemNames = criteriaData.flatMap(([, items]) => items.map(([name]) => name));

    // ===== Sheet 2: 점검결과 =====
    this.buildResultSheet(workbook, events, year, month, monthStr, companyCode, companyName, executiveName, itemNames);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /* ── 점검기준 시트 (DB 기반) ── */
  private buildCriteriaSheet(workbook: ExcelJS.Workbook, criteriaData: CriteriaData) {
    const ws = workbook.addWorksheet('점검기준');

    ws.getColumn('A').width = 17;
    ws.getColumn('B').width = 32;
    ws.getColumn('C').width = 78;

    // 헤더 (Row 1)
    const headerRow = ws.getRow(1);
    headerRow.values = ['분  류', '항  목', '상 세 내 용'];
    headerRow.eachCell(cell => {
      cell.font = { name: 'Malgun Gothic', size: 12, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = THIN_BORDER;
    });

    // 데이터 행 생성 + 병합
    let rowIdx = 2;
    const mergeRanges: [number, number][] = [];

    criteriaData.forEach(([catName, items]) => {
      const startRow = rowIdx;
      items.forEach(([itemName, desc], i) => {
        const r = ws.getRow(rowIdx);
        r.values = [i === 0 ? catName : '', itemName, desc];
        r.getCell('A').font = { name: 'Malgun Gothic', size: 12, bold: true };
        r.getCell('A').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        r.getCell('B').font = { name: 'Malgun Gothic', size: 11, bold: true };
        r.getCell('B').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        r.getCell('C').font = { name: 'Malgun Gothic', size: 11 };
        r.getCell('C').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        r.eachCell(cell => { cell.border = THIN_BORDER; });
        rowIdx++;
      });
      if (items.length > 1) mergeRanges.push([startRow, rowIdx - 1]);
    });

    mergeRanges.forEach(([s, e]) => ws.mergeCells(`A${s}:A${e}`));
  }

  /* ── 점검결과 시트 ── */
  private buildResultSheet(
    workbook: ExcelJS.Workbook,
    events: any[],
    year: number,
    month: number,
    monthStr: string,
    companyCode: string,
    companyName: string,
    executiveName: string,
    itemNames: string[] = [],
  ) {
    const ws = workbook.addWorksheet('점검결과');

    // 컬럼 너비
    ws.getColumn('A').width = 4;
    ws.getColumn('B').width = 10;
    ws.getColumn('C').width = 12;
    ws.getColumn('D').width = 27;
    ws.getColumn('E').width = 41;
    ws.getColumn('F').width = 12;
    ws.getColumn('G').width = 10;
    ws.getColumn('H').width = 12;
    ws.getColumn('I').width = 18;
    ws.getColumn('J').width = 18;
    ws.getColumn('K').width = 18;
    ws.getColumn('L').width = 18;
    ws.getColumn('M').width = 33;

    // Row 2: 타이틀
    ws.getRow(2).height = 24;
    const titleCell = ws.getCell('B2');
    titleCell.value = `■ 변동점 담당제 ${monthStr}월 점검결과`;
    titleCell.font = { name: 'Malgun Gothic', size: 18, bold: true };

    // Row 4: 협력사 정보
    ws.getRow(4).height = 22.5;
    const infoData: [string, string][] = [
      ['협력사코드', companyCode],
      ['협력사명', companyName],
      ['전담중역', executiveName],
    ];
    ws.getCell('B4').value = '협력사코드';
    ws.getCell('C4').value = companyCode;
    ws.getCell('D4').value = '협력사명';
    ws.getCell('E4').value = companyName;
    ws.getCell('F4').value = '전담중역';
    ws.getCell('G4').value = executiveName;
    ['B4', 'C4', 'D4', 'E4', 'F4', 'G4'].forEach(addr => {
      const c = ws.getCell(addr);
      c.font = { name: 'Malgun Gothic', size: 11, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = THIN_BORDER;
    });

    // Row 5: 드랍박스 선택 도우미 텍스트
    const yellowFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    ws.getCell('D5').value = '드랍박스 선택';
    ws.getCell('D5').fill = yellowFill;
    ws.getCell('D5').font = { name: 'Malgun Gothic', size: 11 };
    ws.getCell('L5').value = '드랍박스 선택';
    ws.getCell('L5').fill = yellowFill;
    ws.getCell('L5').font = { name: 'Malgun Gothic', size: 11 };

    // Rows 6-7: 2단 헤더
    ws.getRow(6).height = 18.75;
    ws.getRow(7).height = 18.75;

    // 병합
    ws.mergeCells('B6:B7');  // NO
    ws.mergeCells('C6:G6');  // 발생내역
    ws.mergeCells('H6:K6');  // 조치결과
    ws.mergeCells('L6:L7');  // Q-POINT 설치여부
    ws.mergeCells('M6:M7');  // 비고

    // Row 6 값
    ws.getCell('B6').value = 'NO';
    ws.getCell('C6').value = '발생내역';
    ws.getCell('H6').value = '조치결과';
    ws.getCell('L6').value = 'Q-POINT\n설치여부';
    ws.getCell('M6').value = '비고';

    // Row 7 서브헤더
    ws.getCell('C7').value = '발생일';
    ws.getCell('D7').value = '발생항목';
    ws.getCell('E7').value = '상세내용';
    ws.getCell('F7').value = '발생부서';
    ws.getCell('G7').value = '담당자';
    ws.getCell('H7').value = '조치시점';
    ws.getCell('I7').value = '조치방안';
    ws.getCell('J7').value = '조치결과';
    ws.getCell('K7').value = '품질검증';

    // 헤더 스타일 적용
    const headerCells = [
      'B6', 'C6', 'H6', 'L6', 'M6',
      'C7', 'D7', 'E7', 'F7', 'G7', 'H7', 'I7', 'J7', 'K7',
    ];
    headerCells.forEach(addr => {
      const c = ws.getCell(addr);
      c.font = HEADER_FONT;
      c.fill = HEADER_FILL;
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = THIN_BORDER;
    });

    // 데이터 행
    const startRow = 8;
    if (events.length === 0) {
      ws.getCell(`E${startRow}`).value = '변경사항 없음';
      ws.getCell(`E${startRow}`).font = { name: 'Malgun Gothic', size: 11 };
      ws.getCell(`E${startRow}`).border = THIN_BORDER;
    } else {
      events.forEach((event, idx) => {
        const r = startRow + idx;
        const row = ws.getRow(r);

        // 발생항목: 세부항목명만 표시
        const itemLabel = event.primaryItem?.name || '';

        ws.getCell(`B${r}`).value = idx + 1;
        ws.getCell(`C${r}`).value = event.occurredDate
          ? `${event.occurredDate.getMonth() + 1}월 ${event.occurredDate.getDate()}일`
          : '';
        ws.getCell(`D${r}`).value = itemLabel;
        ws.getCell(`E${r}`).value = event.description || '';
        ws.getCell(`F${r}`).value = event.department || '';
        ws.getCell(`G${r}`).value = event.manager?.name || '';
        ws.getCell(`H${r}`).value = event.actionDate
          ? `${new Date(event.actionDate).getMonth() + 1}월 ${new Date(event.actionDate).getDate()}일`
          : '';
        ws.getCell(`I${r}`).value = event.actionPlan || '';
        ws.getCell(`J${r}`).value = event.actionResult || '';
        ws.getCell(`K${r}`).value = event.qualityVerification || '';
        ws.getCell(`L${r}`).value = ''; // Q-POINT
        ws.getCell(`M${r}`).value = ''; // 비고

        // 셀 스타일
        ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
          const cell = ws.getCell(`${col}${r}`);
          cell.font = { name: 'Malgun Gothic', size: 11 };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = THIN_BORDER;
        });
        // NO열 가운데 정렬
        ws.getCell(`B${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`G${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`H${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`L${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    // L열 데이터 검증 (드롭다운: ●, X)
    const lastDataRow = Math.max(startRow + events.length - 1, startRow + 18);
    for (let r = startRow; r <= lastDataRow; r++) {
      ws.getCell(`L${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"●,X"'],
      };
    }

    // D열 발생항목 드롭다운 (세부항목 리스트)
    if (itemNames.length > 0) {
      const itemList = itemNames.join(',');
      for (let r = startRow; r <= lastDataRow; r++) {
        ws.getCell(`D${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${itemList}"`],
        };
      }
    }

    // 뷰 고정
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 7 }];
  }
}
