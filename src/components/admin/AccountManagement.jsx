"use client";

import React, { useState } from "react";
import { useWarehouse } from "../../context/WarehouseContext";
import { CustomSelect } from "../common/CustomSelect";

export const AccountManagement = () => {
  const { currentUser, users, addUser, updateUser, toggleUserStatus, deleteUser, warehouse } =
    useWarehouse();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nip: "",
    role: "operator",
    unitGudang: warehouse.name,
    password: "",
  });

  // Guard: Hanya Superadmin yang boleh mengakses
  if (currentUser?.role !== "superadmin") {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm max-w-lg mx-auto my-12">
        <span className="material-symbols-outlined text-5xl text-red-500 mb-3">
          gpp_bad
        </span>
        <h2 className="text-lg font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-xs text-slate-500 mt-1">
          Halaman "Atur Akun" ini hanya dapat diakses oleh peran <strong>Superadmin (Admin Pusat)</strong>.
        </p>
      </div>
    );
  }

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nip?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      nip: "",
      role: "operator",
      unitGudang: warehouse.name,
      password: "",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      nip: u.nip || "",
      role: u.role,
      unitGudang: u.unitGudang || warehouse.name,
      password: "",
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("Nama dan email wajib diisi.");
      return;
    }

    if (editingUser) {
      const updates = {
        name: formData.name,
        email: formData.email,
        nip: formData.nip,
        role: formData.role,
        unitGudang: formData.unitGudang,
      };
      if (formData.password.trim()) {
        updates.password = formData.password.trim();
      }
      updateUser(editingUser.id, updates);
    } else {
      if (!formData.password.trim()) {
        alert("Kata sandi awal wajib diisi untuk pengguna baru.");
        return;
      }
      addUser({
        name: formData.name,
        email: formData.email,
        nip: formData.nip,
        role: formData.role,
        unitGudang: formData.unitGudang,
        password: formData.password,
      });
    }

    setIsAddModalOpen(false);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "superadmin":
        return {
          label: "Superadmin",
          color: "bg-purple-100 text-purple-800 border-purple-200",
          icon: "admin_panel_settings",
        };
      case "kepala_gudang":
        return {
          label: "Kepala Gudang",
          color: "bg-blue-100 text-[#1E3D73] border-blue-200",
          icon: "warehouse",
        };
      case "operator":
      default:
        return {
          label: "Operator Gudang",
          color: "bg-amber-100 text-amber-800 border-amber-200",
          icon: "smartphone",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[#1E3D73]">
              manage_accounts
            </span>
            <h1 className="text-xl font-bold text-[#0A1630]">
              Manajemen Akun & Hak Akses
            </h1>
            <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
              Khusus Superadmin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengaturan kredensial pengguna, hierarki hak akses, dan penugasan unit pergudangan Bulog.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#1E3D73] hover:bg-[#162D55] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Total Pengguna
          </span>
          <p className="text-2xl font-bold font-mono text-[#0A1630]">{users.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Terdaftar di sistem SIGAP</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Superadmin Pusat
          </span>
          <p className="text-2xl font-bold font-mono text-purple-700">
            {users.filter((u) => u.role === "superadmin").length}
          </p>
          <p className="text-[11px] text-purple-600 mt-1">Hak akses penuh</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Kepala Gudang
          </span>
          <p className="text-2xl font-bold font-mono text-[#1E3D73]">
            {users.filter((u) => u.role === "kepala_gudang").length}
          </p>
          <p className="text-[11px] text-blue-600 mt-1">Penanggung jawab unit</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Operator Lapangan
          </span>
          <p className="text-2xl font-bold font-mono text-amber-700">
            {users.filter((u) => u.role === "operator").length}
          </p>
          <p className="text-[11px] text-amber-600 mt-1">Petugas scan & opname</p>
        </div>
      </div>

      {/* User Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              placeholder="Cari nama, email, atau NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1E3D73]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Role:</span>
            <div className="w-full sm:w-48">
              <CustomSelect
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                size="sm"
                options={[
                  { value: "ALL", label: "Semua Role" },
                  { value: "superadmin", label: "Superadmin", icon: "shield_person" },
                  { value: "kepala_gudang", label: "Kepala Gudang", icon: "badge" },
                  { value: "operator", label: "Operator Lapangan", icon: "person" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Nama & Profil</th>
                <th className="p-3.5">NIP Bulog</th>
                <th className="p-3.5">Role / Peran</th>
                <th className="p-3.5">Penugasan Unit</th>
                <th className="p-3.5">Terakhir Masuk</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    Tidak ada akun pengguna yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleBadge = getRoleBadge(u.role);
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              u.role === "superadmin"
                                ? "bg-purple-600 text-white"
                                : u.role === "kepala_gudang"
                                ? "bg-[#1E3D73] text-white"
                                : "bg-[#F0A516] text-[#0A1630]"
                            }`}
                          >
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 font-mono text-[11px] block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-700">{u.nip || "-"}</td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleBadge.color}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {roleBadge.icon}
                          </span>
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">
                        {u.unitGudang || "GBB CISKID"}
                      </td>

                      <td className="p-3.5 text-slate-500 text-[11px] font-mono">
                        {u.lastLogin || "-"}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(u.id)}
                          disabled={isCurrent}
                          title={isCurrent ? "Tidak dapat menonaktifkan akun sendiri" : "Klik untuk ubah status"}
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border transition-all ${
                            u.status === "aktif"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                              : "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                          } ${isCurrent ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {u.status === "aktif" ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-[#1E3D73] transition-colors"
                            title="Edit Akun"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                if (confirm(`Apakah Anda yakin ingin menghapus akun ${u.name}?`)) {
                                  deleteUser(u.id);
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                              title="Hapus Akun"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Pengguna */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#1E3D73]">
                  {editingUser ? "edit_square" : "person_add"}
                </span>
                <h3 className="font-bold text-base text-[#0A1630]">
                  {editingUser ? "Edit Akun Pengguna" : "Tambah Pengguna Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rahmat Hidayat, S.E."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Pegawai Bulog
                </label>
                <input
                  type="text"
                  placeholder="19900101 201501 1 002"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#1E3D73]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Resmi Bulog
                </label>
                <input
                  type="email"
                  required
                  placeholder="nama@bulog.co.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role / Hak Akses
                  </label>
                  <CustomSelect
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    size="sm"
                    options={[
                      { value: "operator", label: "Operator Gudang", icon: "person" },
                      { value: "kepala_gudang", label: "Kepala Gudang", icon: "badge" },
                      { value: "superadmin", label: "Superadmin", icon: "shield_person" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Penugasan Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unitGudang}
                    onChange={(e) => setFormData({ ...formData, unitGudang: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? "Ganti Kata Sandi (Kosongkan bila tetap)" : "Kata Sandi Awal"}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? "••••••••" : "Minimal 6 karakter"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#1E3D73]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E3D73] hover:bg-[#162D55] text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {editingUser ? "Simpan Perubahan" : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
