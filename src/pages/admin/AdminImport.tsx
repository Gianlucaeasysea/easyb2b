import DataImporter from "@/components/admin/DataImporter";

const AdminImport = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Import Data</h1>
    <p className="text-sm text-muted-foreground mb-8">
      Import client records and order history from CSV or XLSX files
    </p>
    <DataImporter />
  </div>
);

export default AdminImport;
