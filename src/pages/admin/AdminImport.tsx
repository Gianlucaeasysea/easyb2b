import DataImporter from "@/components/admin/DataImporter";

const AdminImport = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Importa Dati</h1>
    <p className="text-sm text-muted-foreground mb-8">
      Importa anagrafiche clienti e storico ordini da file CSV o XLSX
    </p>
    <DataImporter />
  </div>
);

export default AdminImport;
