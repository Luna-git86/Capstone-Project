
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

type TicketStatus =
  | 'MENUNGGU_TRIASE'
  | 'DIPROSES'
  | 'SELESAI'
  | 'DITOLAK';

type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';

type Ticket = {
  id: number;
  judul: string;
  deskripsi: string;
  prioritas: TicketPriority;
  status: TicketStatus;
  deadline: string | null;
  createdAt: string;
  pembuat?: {
    id: number;
    nama: string;
    role?: string;
  } | null;
  divisi?: {
    id: number;
    nama: string;
  } | null;
  pelaksana?: {
    id: number;
    nama: string;
  } | null;
};

const statusLabels: Record<TicketStatus, string> = {
  MENUNGGU_TRIASE: 'Belum Dikerjakan',
  DIPROSES: 'Sedang Dikerjakan',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
};

const priorityLabels: Record<TicketPriority, string> = {
  HIGH: 'Urgent',
  MEDIUM: 'High',
  LOW: 'Low',
};

const priorityColors = {
  HIGH: {
    bg: 'bg-red-600',
    text: 'text-red-600',
    dot: 'bg-red-600',
    border: 'border-red-200',
  },
  MEDIUM: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  LOW: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    dot: 'bg-green-500',
    border: 'border-green-200',
  },
};

function formatDate(dateString: string | null) {
  if (!dateString) return 'Tidak ada deadline';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Tanggal tidak valid';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(error: any) {
  return (
    error?.response?.data?.message ||
    'Terjadi kesalahan. Silakan coba kembali.'
  );
}

export default function SemuaTugas() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setError('');

      const response = await api.get('/tickets');
      const data = response.data?.data;

      if (!Array.isArray(data)) {
        throw new Error('Format data tiket dari server tidak sesuai.');
      }

      setTickets(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Gagal mengambil daftar tugas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const updateStatus = async (
    ticket: Ticket,
    newStatus: TicketStatus
  ) => {
    if (processingId !== null) return;

    const previousTickets = tickets;

    setProcessingId(ticket.id);
    setActionError('');

    // Tampilkan status baru langsung sambil menunggu server.
    setTickets((current) =>
      current.map((item) =>
        item.id === ticket.id
          ? { ...item, status: newStatus }
          : item
      )
    );

    try {
      await api.patch(`/tickets/${ticket.id}/status`, {
        status: newStatus,
      });

      // Ambil ulang data resmi dari database.
      await fetchTickets();
    } catch (err: any) {
      // Kembalikan data jika perubahan gagal.
      setTickets(previousTickets);
      setActionError(
        `Gagal mengubah status "${ticket.judul}": ${getErrorMessage(err)}`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedTaskId((current) => (current === id ? null : id));
  };

  const urgentTasks = tickets.filter(
    (ticket) =>
      ticket.prioritas === 'HIGH' &&
      ticket.status !== 'SELESAI' &&
      ticket.status !== 'DITOLAK'
  );

  const otherTasks = tickets.filter(
    (ticket) =>
      ticket.prioritas !== 'HIGH' &&
      ticket.status !== 'SELESAI' &&
      ticket.status !== 'DITOLAK'
  );

  const completedTasks = tickets.filter(
    (ticket) => ticket.status === 'SELESAI'
  );

  const rejectedTasks = tickets.filter(
    (ticket) => ticket.status === 'DITOLAK'
  );

  const divisionName =
    tickets.find((ticket) => ticket.divisi?.nama)?.divisi?.nama ||
    'Divisi Saya';

  const renderTask = (task: Ticket) => {
    const isExpanded = expandedTaskId === task.id;
    const colors = priorityColors[task.prioritas] ?? priorityColors.LOW;
    const isProcessing = processingId === task.id;

    return (
      <div key={task.id} className="mb-4">
        <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-100 bg-white pr-3 shadow-sm md:pr-6">
          <div className={`w-2 shrink-0 md:w-3 ${colors.bg}`} />

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-5 pl-4 pr-2 md:flex-row md:items-center md:pl-5 md:pr-0">
            <div className="flex min-w-0 items-start gap-3 md:gap-4">
              <div
                className={`mt-1 flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 ${colors.border}`}
              >
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                <span className={`text-xs font-semibold ${colors.text}`}>
                  {priorityLabels[task.prioritas] || task.prioritas}
                </span>
              </div>

              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold leading-tight text-slate-900 md:text-xl">
                  {task.judul}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {formatDate(task.deadline || task.createdAt)}
                  </span>

                  <span
                    className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      task.status === 'DIPROSES'
                        ? 'bg-blue-100 text-blue-700'
                        : task.status === 'SELESAI'
                          ? 'bg-green-100 text-green-700'
                          : task.status === 'DITOLAK'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {statusLabels[task.status] || task.status}
                  </span>

                  {task.divisi?.nama && (
                    <span className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                      {task.divisi.nama}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              {task.status === 'MENUNGGU_TRIASE' && (
                <button
                  type="button"
                  disabled={isProcessing || processingId !== null}
                  onClick={() => void updateStatus(task, 'DIPROSES')}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? 'Memproses...' : 'Mulai'}
                </button>
              )}

              {task.status === 'DIPROSES' && (
                <button
                  type="button"
                  disabled={isProcessing || processingId !== null}
                  onClick={() => void updateStatus(task, 'SELESAI')}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? 'Menyimpan...' : 'Selesaikan'}
                </button>
              )}

              <button
                type="button"
                aria-label={isExpanded ? 'Tutup detail tugas' : 'Buka detail tugas'}
                aria-expanded={isExpanded}
                onClick={() => toggleExpand(task.id)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <svg
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="ml-2 rounded-b-xl border-x border-b border-slate-200 bg-slate-50 p-5 shadow-inner md:ml-3 md:p-6">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Deskripsi Tugas
            </h4>

            <p className="mb-6 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
              {task.deskripsi || 'Tidak ada deskripsi.'}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <div>
                <span className="text-slate-500">Ditugaskan oleh: </span>
                <span className="font-bold text-slate-900">
                  {task.pembuat?.nama || 'Tidak diketahui'}
                </span>
              </div>

              <div>
                <span className="text-slate-500">Pelaksana: </span>
                <span className="font-bold text-slate-900">
                  {task.pelaksana?.nama || 'Belum ditentukan'}
                </span>
              </div>

              <div>
                <span className="text-slate-500">Deadline: </span>
                <span className="font-bold text-slate-900">
                  {formatDate(task.deadline)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full p-8">
        <p className="text-sm text-slate-500">Memuat daftar tugas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl p-8">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Tugas Aktif
        </h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchTickets();
          }}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl p-4 md:p-8">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h2 className="text-xl font-medium text-slate-500">
          {divisionName}
        </h2>
        <h1 className="text-3xl font-bold leading-tight text-slate-900">
          Tugas Aktif
        </h1>
        <p className="mt-1 text-sm text-slate-400 md:text-lg">
          {urgentTasks.length + otherTasks.length} tugas tersisa
        </p>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="font-bold"
            aria-label="Tutup pesan"
          >
            ×
          </button>
        </div>
      )}

      {urgentTasks.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            <h2 className="text-lg font-bold text-red-600">
              Urgent - Kerjakan Segera
            </h2>
          </div>
          {urgentTasks.map(renderTask)}
        </section>
      )}

      {otherTasks.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 ml-1 text-lg font-bold text-slate-900">
            Tugas Lainnya
          </h2>
          {otherTasks.map(renderTask)}
        </section>
      )}

      {tickets.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h3 className="font-semibold text-slate-700">
            Belum ada tugas
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tugas yang ditugaskan kepada akunmu akan muncul di sini.
          </p>
        </div>
      )}

      {(completedTasks.length > 0 || rejectedTasks.length > 0) && (
        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Riwayat Tugas
          </h2>

          {completedTasks.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-green-700">
                Selesai ({completedTasks.length})
              </h3>
              {completedTasks.map(renderTask)}
            </div>
          )}

          {rejectedTasks.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-red-700">
                Ditolak ({rejectedTasks.length})
              </h3>
              {rejectedTasks.map(renderTask)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
