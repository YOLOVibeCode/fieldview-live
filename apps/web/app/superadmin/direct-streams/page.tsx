/**
 * Super Admin DirectStreams Console
 * 
 * Comprehensive management dashboard for all DirectStreams using TanStack Table.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
  flexRender,
} from '@tanstack/react-table';
import { apiRequest, ApiError } from '../../../lib/api-client';
import { EventManagement } from './EventManagement';

interface DirectStream {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduledStartAt: string | null;
  paywallEnabled: boolean;
  priceInCents: number;
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  listed: boolean;
  registrationsCount: number;
  ownerAccount: {
    id: string;
    name: string;
    contactEmail: string;
  };
  createdAt: string;
}

export default function SuperAdminDirectStreamsPage() {
  const [streams, setStreams] = useState<DirectStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'scheduledStartAt', desc: false }, // Soonest upcoming first
  ]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedStream, setSelectedStream] = useState<DirectStream | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  // Fetch streams
  const fetchStreams = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ streams: DirectStream[] }>(
        `/api/admin/direct-streams?status=${statusFilter}`,
        { method: 'GET' }
      );
      setStreams(response.streams);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStreams();
  }, [statusFilter]);

  // Table columns
  const columns: ColumnDef<DirectStream>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="text-sm px-2"
          data-testid={`btn-expand-${row.original.slug}`}
        >
          {row.getIsExpanded() ? '▼' : '▶'}
        </button>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <a
          href={`/${row.original.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-mono"
          data-testid={`link-stream-${row.original.slug}`}
        >
          {row.original.slug}
        </a>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-semibold" data-testid={`title-${row.original.slug}`}>
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: 'scheduledStartAt',
      header: 'Scheduled Start',
      cell: ({ row }) => {
        const date = row.original.scheduledStartAt;
        if (!date) return <span className="text-muted-foreground">Not scheduled</span>;
        return (
          <span data-testid={`scheduled-${row.original.slug}`}>
            {new Date(date).toLocaleString()}
          </span>
        );
      },
      sortingFn: 'datetime',
    },
    {
      accessorKey: 'registrationsCount',
      header: 'Registrations',
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedStream(row.original)}
          className="text-blue-600 hover:underline"
          data-testid={`btn-registrations-${row.original.slug}`}
        >
          {row.original.registrationsCount} viewers
        </button>
      ),
    },
    {
      accessorKey: 'paywallEnabled',
      header: 'Paywall',
      cell: ({ row }) => (
        <span data-testid={`paywall-${row.original.slug}`}>
          {row.original.paywallEnabled ? (
            <span className="text-green-600">
              ${(row.original.priceInCents / 100).toFixed(2)}
            </span>
          ) : (
            <span className="text-muted-foreground">Free</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'chatEnabled',
      header: 'Chat',
      cell: ({ row }) => (
        <span data-testid={`chat-${row.original.slug}`}>
          {row.original.chatEnabled ? '✅' : '❌'}
        </span>
      ),
    },
    {
      accessorKey: 'scoreboardEnabled',
      header: 'Scoreboard',
      cell: ({ row }) => (
        <span data-testid={`scoreboard-${row.original.slug}`}>
          {row.original.scoreboardEnabled ? '✅' : '❌'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleImpersonate(row.original.slug)}
            className="text-primary hover:underline text-sm"
            data-testid={`btn-impersonate-${row.original.slug}`}
          >
            Impersonate Admin
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: streams,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  const handleImpersonate = async (slug: string) => {
    try {
      const response = await apiRequest<{ adminToken: string }>(
        `/admin/direct-streams/${slug}/impersonate`,
        { method: 'POST' }
      );
      localStorage.setItem(`admin_token_${slug}`, response.adminToken);
      window.open(`/${slug}`, '_blank');
    } catch (error) {
      console.error('Failed to impersonate:', error);
      alert('Failed to generate admin token');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8" data-testid="page-superadmin-streams">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Direct Streams Console</h1>
            <p className="text-muted-foreground mt-1">Manage all direct stream pages</p>
          </div>
          <button
            onClick={() => setShowCreateDrawer(true)}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-semibold"
            data-testid="btn-create-stream"
          >
            + Create Stream
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-lg shadow border border-border mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-foreground">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-border rounded px-3 py-2 bg-input text-foreground"
              data-testid="select-status-filter"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deleted">Deleted</option>
            </select>
            <span className="text-sm text-muted-foreground">{streams.length} streams</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground" data-testid="loading-streams">
              Loading streams...
            </div>
          ) : streams.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground" data-testid="empty-streams">
              No streams found. Create your first stream!
            </div>
          ) : (
            <table className="w-full" data-testid="table-streams">
              <thead className="bg-secondary border-b border-border">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-accent"
                        onClick={header.column.getToggleSortingHandler()}
                        data-testid={`header-${header.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.map((row) => (
                  <>
                    <tr
                      key={row.id}
                      className="hover:bg-secondary/50"
                      data-testid={`row-${row.original.slug}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {row.getIsExpanded() && (
                      <tr key={`${row.id}-expanded`}>
                        <td colSpan={columns.length} className="px-6 py-4 bg-secondary/20">
                          <EventManagement 
                            parentStreamId={row.original.id}
                            parentSlug={row.original.slug}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Registrations Modal (simplified for now) */}
        {selectedStream && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            data-testid="modal-registrations"
            onClick={() => setSelectedStream(null)}
          >
            <div
              className="bg-card p-6 rounded-lg border border-border max-w-4xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">{selectedStream.title} - Registrations</h2>
              <p className="text-muted-foreground mb-4">
                {selectedStream.registrationsCount} total registrations
              </p>
              <button
                onClick={() => setSelectedStream(null)}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/80"
                data-testid="btn-close-registrations"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Create Drawer (simplified placeholder) */}
        {showCreateDrawer && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            data-testid="drawer-create-stream"
            onClick={() => setShowCreateDrawer(false)}
          >
            <div
              className="bg-card p-8 rounded-lg border border-border max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Create Direct Stream</h2>
              <p className="text-muted-foreground mb-6">Feature coming soon!</p>
              <button
                onClick={() => setShowCreateDrawer(false)}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/80"
                data-testid="btn-close-create"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

