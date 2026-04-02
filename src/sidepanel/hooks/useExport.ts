import { useCallback } from 'react';
import { exportMatrixToExcel, exportAccordionToExcel } from '../utils/excel-export';
import type { MatrixData, AccordionData } from '../types/permissions';

export function useExport() {
  const exportMatrix = useCallback((data: MatrixData) => {
    exportMatrixToExcel(data);
  }, []);

  const exportAccordion = useCallback((data: AccordionData) => {
    exportAccordionToExcel(data);
  }, []);

  return { exportMatrix, exportAccordion };
}
