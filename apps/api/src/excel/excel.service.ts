import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, ChangeEvent, InspectionResult } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async generateMonthlyReport(year: number, month: number): Promise<Buffer> {
    const events = await this.prisma.changeEvent.findMany({
      where: {
        status: 'APPROVED',
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
        deletedAt: null,
      },
      include: {
        company: true,
        manager: true,
        executive: true,
        reviewer: true,
        inspectionResults: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    
    // 01_MasterList 시트
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
      { header: '4M/4M외', key: 'changeType', width: 10 },
      { header: '대분류', key: 'category', width: 15 },
      { header: '세부항목', key: 'subCategory', width: 15 },
      { header: '변경내용', key: 'description', width: 30 },
      { header: '발생부서', key: 'department', width: 15 },
      { header: '실무담당자', key: 'managerName', width: 12 },
      { header: '전담중역', key: 'executiveName', width: 12 },
      { header: '상태', key: 'status', width: 10 },
    ];

    events.forEach((event) => {
      masterSheet.addRow({
        receiptMonth: event.receiptMonth,
        occurredDate: event.occurredDate.toISOString().split('T')[0],
        customer: event.customer,
        project: event.project,
        productLine: event.productLine,
        partNumber: event.partNumber,
        factory: event.factory,
        productionLine: event.productionLine,
        companyName: event.company.name,
        changeType: event.changeType,
        category: event.category,
        subCategory: event.subCategory,
        description: event.description,
        department: event.department,
        managerName: event.manager.name,
        executiveName: event.executive?.name || '',
        status: event.status,
      });
    });

    // 99_Code 시트
    const codeSheet = workbook.addWorksheet('99_Code');
    codeSheet.columns = [
      { header: '구분', key: 'type', width: 15 },
      { header: '코드', key: 'code', width: 15 },
      { header: '명칭', key: 'name', width: 30 },
    ];

    // 98_InspectionResult 시트
    const resultSheet = workbook.addWorksheet('98_InspectionResult');
    resultSheet.columns = [
      { header: '변동점 ID', key: 'eventId', width: 15 },
      { header: '점검항목', key: 'itemName', width: 30 },
      { header: '결과', key: 'value', width: 30 },
    ];

    events.forEach((event) => {
      event.inspectionResults.forEach((result) => {
        resultSheet.addRow({
          eventId: event.id,
          itemName: result.item.question,
          value: result.value,
        });
      });
    });

    // 스타일 적용
    [masterSheet, codeSheet, resultSheet].forEach(sheet => {
      // 헤더 스타일
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      
      // 테두리 스타일
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
    });

    // 엑셀 파일 생성
    return await workbook.xlsx.writeBuffer();
  }
}
