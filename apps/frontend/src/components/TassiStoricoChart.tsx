import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { type TassoInteresse } from '../api/tassi-interesse';

interface TassiStoricoChartProps {
  tassi: TassoInteresse[];
}

export function TassiStoricoChart({ tassi }: TassiStoricoChartProps) {
  const chartData = useMemo(() => {
    // Raggruppa i tassi per data di inizio validità
    const dataMap = new Map<string, { dateLabel: string; dateValue: number; legale?: number; moratorio?: number }>();

    tassi.forEach((tasso) => {
      const dateObj = new Date(tasso.dataInizioValidita);
      const dateKey = dateObj.toISOString().slice(0, 7);
      const dateLabel = dateObj.toLocaleDateString('it-IT', {
        month: 'short',
        year: 'numeric',
      });
      const dateValue = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getTime();

      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { dateLabel, dateValue });
      }

      const entry = dataMap.get(dateKey)!;
      if (tasso.tipo === 'legale') {
        entry.legale = tasso.tassoPercentuale;
      } else {
        entry.moratorio = tasso.tassoPercentuale;
      }
    });

    // Converti in array e ordina per data
    return Array.from(dataMap.values()).sort((a, b) => {
      return a.dateValue - b.dateValue;
    });
  }, [tassi]);

  if (chartData.length === 0) {
    return (
      <div className="wow-panel p-6 text-center">
        <p className="text-sm text-slate-500">Nessun dato disponibile per il grafico</p>
      </div>
    );
  }

  return (
    <div className="wow-panel p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Storico Tassi di Interesse</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: 'Tasso (%)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
            formatter={(value) => value ? [`${Number(value).toFixed(2)}%`, ''] : ['N/A', '']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="legale"
            stroke="#3B82F6"
            strokeWidth={2}
            name="Tasso Legale"
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="moratorio"
            stroke="#9333EA"
            strokeWidth={2}
            name="Tasso Moratorio"
            dot={{ fill: '#9333EA', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        <p className="mb-2 text-xs">
          <strong>Nota:</strong> Il grafico mostra l'andamento storico dei tassi di interesse configurati nel sistema.
        </p>
        <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
          <li><span className="text-blue-600 font-semibold">Tasso Legale:</span> Aggiornato annualmente dal MEF (gennaio)</li>
          <li><span className="text-purple-600 font-semibold">Tasso Moratorio:</span> Aggiornato semestralmente dal MEF (gennaio e luglio)</li>
        </ul>
      </div>
    </div>
  );
}
