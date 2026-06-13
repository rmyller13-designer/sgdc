import { supabase } from "../../lib/supabase";
import KanbanDemandas from "../../components/KanbanDemandas";

export default async function Demandas() {
  const { data: demandas, error } = await supabase
    .from("demandas_kanban")
    .select("*")
    .order("id", { ascending: false });

  return (
    <div>
      <h1>Demandas</h1>

      <p style={subtitulo}>
        Visualização em Kanban por status. Arraste os cards para alterar o
        status.
      </p>

      {error && (
        <pre style={{ color: "red" }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <KanbanDemandas demandas={demandas || []} />
    </div>
  );
}

const subtitulo = {
  color: "#fecaca",
  marginTop: "6px",
  marginBottom: "24px",
};