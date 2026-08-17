export type RootStackParamList = {
  MainTabs: undefined;
  Checkout: undefined;
  Scanner: undefined;
  ProductForm: { productId?: string } | undefined;
  Inventory: undefined;
  ProductKardex: { productId: string; productName: string };
  Suppliers: undefined;
  SupplierForm: { supplierId?: string } | undefined;
  Purchases: undefined;
  PurchaseForm: undefined;
  PurchaseDetail: { purchaseId: string };
  Sales: undefined;
  SaleDetail: { saleId: string };
  Invoices: undefined;
  InvoiceForm: { saleId: string };
  Notifications: undefined;
  Settings: undefined;
};

export type MainTabsParamList = {
  Pos: undefined;
  Products: undefined;
  Reports: undefined;
  More: undefined;
};
