import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import KanbanDemandas from "../../components/KanbanDemandas";

export default async function Demandas() {
  await connection();

  const { data: demandas, error } = await supabase
    .from("demandas_kanban")
    .select("*")
    .order("id", { ascending: false });

  const demandaIds = (demandas || []).map((demanda) => demanda.id);
  const { data: anexosDemanda } =
    demandaIds.length > 0
      ? await supabase
          .from("demanda_anexos")
          .select("demanda_id, url_arquivo, tipo_arquivo")
          .in("demanda_id", demandaIds)
      : {
          data: [] as Array<{
            demanda_id: number;
            url_arquivo: string;
            tipo_arquivo: string | null;
          }>,
        };

  const previewPorDemanda = new Map<number, string>();
  const anexosPorDemanda = new Map<number, number>();

  for (const anexo of anexosDemanda || []) {
    anexosPorDemanda.set(
      anexo.demanda_id,
      (anexosPorDemanda.get(anexo.demanda_id) || 0) + 1
    );

    if (
      anexo.tipo_arquivo?.startsWith("image/") &&
      !previewPorDemanda.has(anexo.demanda_id)
    ) {
      previewPorDemanda.set(anexo.demanda_id, anexo.url_arquivo);
    }
  }

  const demandasComPreview = (demandas || []).map((demanda) => ({
    ...demanda,
    preview_image_url: previewPorDemanda.get(demanda.id) || null,
    etiqueta: demanda.setor || null,
    anexos_count: anexosPorDemanda.get(demanda.id) || 0,
  }));

  return (
    <div style={pageShell}>
      <div style={kanbanSurface}>
        <h1>Demandas</h1>

        {error && (
          <pre style={{ color: "#fca5a5" }}>{JSON.stringify(error, null, 2)}</pre>
        )}

        <div style={boardShell}>
          <KanbanDemandas demandas={demandasComPreview} />
        </div>
      </div>
    </div>
  );
}

const pageShell = {
  minHeight: "calc(100vh - 140px)",
  height: "calc(100vh - 140px)",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden" as const,
};

const kanbanSurface = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column" as const,
  padding: "14px 16px 16px",
  borderRadius: "18px",
  background:
    "linear-gradient(180deg, rgba(10, 10, 12, 0.78), rgba(17, 17, 20, 0.9))",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.22)",
};

const boardShell = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden" as const,
};
