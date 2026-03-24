import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Tag, Crown } from "lucide-react";
import { toast } from "sonner";

const AdminPriceLists = () => {
  const qc = useQueryClient();
  const [showNewTier, setShowNewTier] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", label: "", discount_pct: 0, sort_order: 0 });
  const [listForm, setListForm] = useState({ name: "", description: "", discount_tier_id: "", client_id: "" });

  const { data: tiers } = useQuery({
    queryKey: ["discount-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("discount_tiers").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: priceLists } = useQuery({
    queryKey: ["price-lists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_lists").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-for-pricelist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, company_name").order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const createTier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("discount_tiers").insert(tierForm as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discount-tiers"] });
      setShowNewTier(false);
      setTierForm({ name: "", label: "", discount_pct: 0, sort_order: 0 });
      toast.success("Classe di sconto creata");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discount-tiers"] });
      toast.success("Classe eliminata");
    },
  });

  const createList = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: listForm.name,
        description: listForm.description || null,
        discount_tier_id: listForm.discount_tier_id || null,
        client_id: listForm.client_id || null,
      };
      const { error } = await supabase.from("price_lists").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      setShowNewList(false);
      setListForm({ name: "", description: "", discount_tier_id: "", client_id: "" });
      toast.success("Listino prezzi creato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success("Listino eliminato");
    },
  });

  const tierColors: Record<string, string> = {
    gold: "bg-yellow-500/20 text-yellow-600",
    silver: "bg-gray-300/30 text-gray-600",
    bronze: "bg-orange-400/20 text-orange-600",
    standard: "bg-muted text-muted-foreground",
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Listini & Classi di Sconto</h1>
      <p className="text-sm text-muted-foreground mb-8">Gestisci le classi di sconto e i listini prezzi per clienti e dealer</p>

      {/* Discount Tiers Section */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Classi di Sconto
          </CardTitle>
          <Dialog open={showNewTier} onOpenChange={setShowNewTier}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuova Classe</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuova Classe di Sconto</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome (ID univoco)</Label>
                  <Input value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} placeholder="es. platinum" />
                </div>
                <div>
                  <Label>Etichetta</Label>
                  <Input value={tierForm.label} onChange={(e) => setTierForm((f) => ({ ...f, label: e.target.value }))} placeholder="es. Platinum" />
                </div>
                <div>
                  <Label>Sconto %</Label>
                  <Input type="number" value={tierForm.discount_pct} onChange={(e) => setTierForm((f) => ({ ...f, discount_pct: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Ordine</Label>
                  <Input type="number" value={tierForm.sort_order} onChange={(e) => setTierForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
                </div>
                <Button onClick={() => createTier.mutate()} disabled={!tierForm.name || !tierForm.label}>Crea</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead>Sconto</TableHead>
                <TableHead>Ordine</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Badge className={tierColors[t.name] || "bg-muted text-muted-foreground"}>
                      {t.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{t.discount_pct}%</TableCell>
                  <TableCell className="text-muted-foreground">{t.sort_order}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteTier.mutate(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Price Lists Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5 text-primary" />
            Listini Prezzi
          </CardTitle>
          <Dialog open={showNewList} onOpenChange={setShowNewList}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuovo Listino</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuovo Listino Prezzi</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={listForm.name} onChange={(e) => setListForm((f) => ({ ...f, name: e.target.value }))} placeholder="es. Listino Gold 2024" />
                </div>
                <div>
                  <Label>Descrizione</Label>
                  <Textarea value={listForm.description} onChange={(e) => setListForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <Label>Classe di Sconto (opzionale)</Label>
                  <Select value={listForm.discount_tier_id || "__none__"} onValueChange={(v) => setListForm((f) => ({ ...f, discount_tier_id: v === "__none__" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nessuna —</SelectItem>
                      {tiers?.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} ({t.discount_pct}%)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cliente specifico (opzionale)</Label>
                  <Select value={listForm.client_id || "__none__"} onValueChange={(v) => setListForm((f) => ({ ...f, client_id: v === "__none__" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Tutti (per classe) —</SelectItem>
                      {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createList.mutate()} disabled={!listForm.name}>Crea Listino</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!priceLists?.length ? (
            <p className="text-center text-muted-foreground py-8">Nessun listino prezzi ancora creato.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Classe/Cliente</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map((pl) => {
                  const tier = tiers?.find((t) => t.id === pl.discount_tier_id);
                  const client = clients?.find((c) => c.id === pl.client_id);
                  return (
                    <TableRow key={pl.id}>
                      <TableCell className="font-medium">{pl.name}</TableCell>
                      <TableCell>
                        {tier && <Badge className={tierColors[tier.name] || "bg-muted text-muted-foreground"}>{tier.label}</Badge>}
                        {client && <span className="text-sm text-muted-foreground ml-2">{client.company_name}</span>}
                        {!tier && !client && <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(pl.created_at).toLocaleDateString("it-IT")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteList.mutate(pl.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPriceLists;
