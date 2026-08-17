import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildSaleTicket, buildSaleTicketHtml } from './ticket';
import type { BusinessSettings, Sale, SaleItem } from '@/models/types';

/**
 * Impresión del ticket.
 *
 * 1. Impresora térmica Bluetooth (ESC/POS): requiere un development build con
 *    el módulo nativo `react-native-bluetooth-escpos-printer` instalado
 *    (ver BUILD.md). Se carga dinámicamente para que la app funcione también
 *    en Expo Go sin el módulo.
 * 2. Fallback universal: genera un PDF del ticket y abre el diálogo de
 *    compartir/imprimir del sistema (AirPrint, apps de impresoras, etc.).
 */

interface BluetoothPrinterModule {
  BluetoothManager: {
    connect: (address: string) => Promise<void>;
  };
  BluetoothEscposPrinter: {
    printRawData?: (base64: string) => Promise<void>;
  };
}

const loadBluetoothModule = (): BluetoothPrinterModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-bluetooth-escpos-printer');
  } catch {
    return null;
  }
};

export type PrintResult = { ok: true; via: 'bluetooth' | 'share' } | { ok: false; error: string };

export const printSaleTicket = async (
  settings: BusinessSettings,
  sale: Sale,
  items: SaleItem[],
): Promise<PrintResult> => {
  // 1) Impresora térmica Bluetooth configurada
  if (settings.printerAddress) {
    const bt = loadBluetoothModule();
    if (bt?.BluetoothEscposPrinter?.printRawData) {
      try {
        await bt.BluetoothManager.connect(settings.printerAddress);
        const bytes = buildSaleTicket(settings, sale, items);
        await bt.BluetoothEscposPrinter.printRawData(bytes.buildBase64());
        return { ok: true, via: 'bluetooth' };
      } catch (e) {
        // Cae al fallback de PDF; se informa el motivo al usuario.
        console.warn('Impresión Bluetooth falló, usando PDF:', e);
      }
    }
  }

  // 2) Fallback: PDF + hoja de compartir del sistema
  try {
    const html = buildSaleTicketHtml(settings, sale, items);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Ticket #${sale.folio}`,
      });
    } else {
      await Print.printAsync({ html });
    }
    return { ok: true, via: 'share' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al imprimir' };
  }
};
