"use client";

import React, { useState, useEffect, useMemo, useRef, useId } from "react";
import { X, Calendar, Calculator, Link2, Unlink } from "lucide-react";
import type { Transaction, Term, Classification } from "@/types";
import { useApp } from "@/context/AppContext";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: string | null;
  mode?: "add" | "edit" | "view";
  activeTerm: Term | null;
  classifications: Classification[];
}

export function TransactionModal({
  isOpen,
  onClose,
  editingId,
  mode = "add",
  activeTerm,
  classifications,
}: TransactionModalProps) {
  const { transactions, addTransaction, updateTransaction } = useApp();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const classificationListId = useId();
  const isViewMode = mode === "view";

  // ── FORM CORE LOCAL STATES ─────────────────────────────────────────
  const [category, setCategory] = useState<"Buy" | "Sell">("Buy");
  const [date, setDate] = useState("");
  const [classification, setClassification] = useState("");
  const [description, setDescription] = useState("");
  const [bags, setBags] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  
  // Explicit Inventory Reference Link State
  const [linkedBuyUid, setLinkedBuyUid] = useState<string | null>(null);

  // Decoupled Ancillary Expense Parameters
  const [agentBagsCount, setAgentBagsCount] = useState<number | "">("");
  const [agentCostPerBag, setAgentCostPerBag] = useState<number | "">("");
  const [agentSameAsBase, setAgentSameAsBase] = useState(false);

  const [transferBagsCount, setTransferBagsCount] = useState<number | "">("");
  const [transferCostPerBag, setTransferCostPerBag] = useState<number | "">("");
  const [transferSameAsBase, setTransferSameAsBase] = useState(false);

  const [otherExp, setOtherExp] = useState<number | "">("");
  const [tags, setTags] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  // ── HYDRATE FORM ON EDIT MODE TRIGGER ──────────────────────────────
  useEffect(() => {
    if (isOpen && editingId) {
      const target = transactions.find((t) => t.id === editingId);
      if (target) {
        setCategory(target.category as "Buy" | "Sell");
        setDate(target.date || "");
        setClassification(target.classification || "");
        setDescription(target.description || "");
        const baseBagsValue = target.bags ?? 0;
        setBags(baseBagsValue);
        setPrice(target.price ?? "");
        
        const storedLinkedBuyUid = (target as any).linked_buy_uid ||
          ((target as any).linked_buy_id
            ? transactions.find((candidate) => candidate.id === (target as any).linked_buy_id)?.uid || null
            : null);

        // Hydrate the relational link state if editing an existing sell transaction
        setLinkedBuyUid(storedLinkedBuyUid);
        
        const loadedAgentBags = (target as any).agent_bags_count ?? target.agent_bags ?? "";
        setAgentBagsCount(loadedAgentBags);
        setAgentCostPerBag((target as any).agent_cost_per_bag ?? "");
        setAgentSameAsBase(loadedAgentBags !== "" && baseBagsValue !== 0 && Number(loadedAgentBags) === Number(baseBagsValue));

        const loadedTransferBags = (target as any).transfer_bags_count ?? target.transfer_bags ?? "";
        setTransferBagsCount(loadedTransferBags);
        setTransferCostPerBag((target as any).transfer_cost_per_bag ?? "");
        setTransferSameAsBase(loadedTransferBags !== "" && baseBagsValue !== 0 && Number(loadedTransferBags) === Number(baseBagsValue));
        
        setOtherExp(target.other_exp ?? "");
        setTags(target.tags || "");
        setReceiptUrl((target as any).receiptUrl || "");
      }
    } else if (isOpen && !editingId) {
      setCategory("Buy");
      setDate(new Date().toISOString().split("T")[0]);
      setClassification(classifications[0]?.name || "");
      setDescription("");
      setBags("");
      setPrice("");
      setLinkedBuyUid(null);
      setAgentBagsCount("");
      setAgentCostPerBag("");
      setAgentSameAsBase(false);
      setTransferBagsCount("");
      setTransferCostPerBag("");
      setTransferSameAsBase(false);
      setOtherExp("");
      setTags("");
      setReceiptUrl("");
    }
  }, [isOpen, editingId, transactions, classifications]);

  // ── DYNAMIC CALCULATED VALUES BREAKDOWN ────────────────────────────
  const calculations = useMemo(() => {
    const baseBagsNum = bags === "" ? 0 : Number(bags);
    const basePriceNum = price === "" ? 0 : Number(price);
    
    const activeAgentBags = agentSameAsBase ? baseBagsNum : (agentBagsCount === "" ? 0 : Number(agentBagsCount));
    const activeAgentCost = agentCostPerBag === "" ? 0 : Number(agentCostPerBag);
    
    const activeTransferBags = transferSameAsBase ? baseBagsNum : (transferBagsCount === "" ? 0 : Number(transferBagsCount));
    const activeTransferCost = transferCostPerBag === "" ? 0 : Number(transferCostPerBag);
    
    const flatOther = otherExp === "" ? 0 : Number(otherExp);

    const baseSubtotal = baseBagsNum * basePriceNum;
    const totalAgentFees = activeAgentBags * activeAgentCost;
    const totalTransferFees = activeTransferBags * activeTransferCost;
    
    const totalTransactionValue = category === "Buy" 
      ? baseSubtotal + totalAgentFees + totalTransferFees + flatOther
      : baseSubtotal - totalAgentFees - totalTransferFees - flatOther;

    return {
      subtotal: baseSubtotal,
      agentFees: totalAgentFees,
      transferFees: totalTransferFees,
      other: flatOther,
      grandTotal: totalTransactionValue,
      effectiveAgentBags: activeAgentBags,
      effectiveTransferBags: activeTransferBags
    };
  }, [bags, price, agentBagsCount, agentCostPerBag, agentSameAsBase, transferBagsCount, transferCostPerBag, transferSameAsBase, otherExp, category]);

  // ── RELATIONAL COMPUTE PASS: FILTER OUT HARD-LINKED TRANSACTIONS ───
  const unsoldBuyTransactions = useMemo(() => {
    if (!activeTerm) return [];

    const linkedBuyUidsSet = new Set<string>();
    transactions.forEach((t) => {
      const isCurrentTerm = t.term_id === activeTerm.id || (t as any).termId === activeTerm.id;
      if (isCurrentTerm && t.category === "Sell") {
        const linkedBuyUidValue =
          (t as any).linked_buy_uid ||
          ((t as any).linked_buy_id
            ? transactions.find((candidate) => candidate.id === (t as any).linked_buy_id)?.uid || null
            : null);

        if (editingId && t.id === editingId) return;
        if (linkedBuyUidValue) linkedBuyUidsSet.add(linkedBuyUidValue);
      }
    });

    return transactions.filter((t) => {
      const isCurrentTerm = t.term_id === activeTerm.id || (t as any).termId === activeTerm.id;
      if (!isCurrentTerm || t.category !== "Buy") return false;

      if (editingId && t.id === editingId) return false;
      
      return !linkedBuyUidsSet.has(t.uid || t.id);
    });
  }, [transactions, activeTerm, editingId]);

  // Find transaction details for our currently active local reference link visualization
  const currentLinkedTransaction = useMemo(() => {
    if (!linkedBuyUid) return null;
    return transactions.find((t) => t.uid === linkedBuyUid) || transactions.find((t) => t.id === linkedBuyUid) || null;
  }, [linkedBuyUid, transactions]);

  const suggestedClassifications = useMemo(() => {
    const collected = new Set<string>();

    classifications.forEach((c) => {
      if (c.name?.trim()) collected.add(c.name.trim());
    });

    transactions.forEach((txn) => {
      const value = txn.classification?.trim();
      if (value) collected.add(value);
    });

    return Array.from(collected).sort((a, b) => a.localeCompare(b));
  }, [classifications, transactions]);

  // ── RELATIONAL HARD-LINK SHORTCUT INJECTOR HANDLER ─────────────────
  function handleInjectShortcut(t: Transaction) {
    // If we are editing an existing record, purely connect the link state without wiping out historical inputs
    if (editingId) {
      setLinkedBuyUid(t.uid || t.id);
      return;
    }

    // Default standalone initialization creation injection mapping flow
    setCategory("Sell");
    setClassification(t.classification || "");
    setDescription(t.description || "");
    setBags(t.bags || "");
    setLinkedBuyUid(t.uid || t.id);
    setPrice(""); 
    
    setAgentBagsCount("");
    setAgentCostPerBag("");
    setAgentSameAsBase(false);
    setTransferBagsCount("");
    setTransferCostPerBag("");
    setTransferSameAsBase(false);
    setOtherExp("");
    if (t.tags) setTags(t.tags); 
  }

  // Break an assigned inventory trace link manually
  function handleClearLink() {
    setLinkedBuyUid(null);
  }

  // ── RECONCILE SUBMIT ROUTE PASS ────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTerm) return;

    const payload = {
      term_id: activeTerm.id,
      termId: activeTerm.id,
      term: activeTerm.name,
      category,
      date,
      classification,
      description: description.trim(),
      bags: bags === "" ? 0 : Number(bags),
      price: price === "" ? 0 : Number(price),
      
      linked_buy_uid: category === "Sell" ? linkedBuyUid : null,
      linked_buy_id:
        category === "Sell"
          ? (transactions.find((transaction) => (transaction.uid || transaction.id) === linkedBuyUid)?.id || null)
          : null,
      
      agent_bags_count: calculations.effectiveAgentBags,
      agent_cost_per_bag: agentCostPerBag === "" ? 0 : Number(agentCostPerBag),
      transfer_bags_count: calculations.effectiveTransferBags,
      transfer_cost_per_bag: transferCostPerBag === "" ? 0 : Number(transferCostPerBag),
      
      agent_bags: calculations.effectiveAgentBags,
      transfer_bags: calculations.effectiveTransferBags,
      
      other_exp: calculations.other,
      tags: tags.trim(),
      receiptUrl: receiptUrl.trim(),
    };

  try {
      if (editingId) {
        await updateTransaction(editingId, payload);
      } else {
        await addTransaction(payload);
      }
      onClose();
    } catch (err) {
      console.error("Submission processing crashed:", err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-100">
              {editingId ? "Modify Existing Ledger Entry" : "Record New System Transaction"}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Target Scope Workspace: <span className="text-[var(--accent)] font-mono font-bold">{activeTerm?.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content Structure */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900">
          
          {/* Left Panel: Primary Input Form Fields */}
          <form 
            onSubmit={handleSubmit} 
            className={`space-y-4 ${category === "Sell" ? "lg:col-span-7" : "lg:col-span-12"} ${isViewMode ? "opacity-95" : ""}`}
          >
            
            {/* Category Toggle Strip */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800/80">
              {(["Buy", "Sell"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (isViewMode) return;
                    setCategory(type);
                    if (type === "Buy") handleClearLink();
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isViewMode ? "cursor-default opacity-80" : "cursor-pointer"
                  } ${
                    category === type
                      ? type === "Buy"
                        ? "bg-rose-500 text-slate-950 shadow-md"
                        : "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  {type} Operation
                </button>
              ))}
            </div>

            {isViewMode && currentLinkedTransaction && (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-800/60 bg-sky-950/30 text-sky-400 animate-fade-in text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <Link2 size={14} className="animate-pulse flex-shrink-0" />
                  <span className="truncate">
                    Linked record: <strong className="font-sans text-slate-200 font-semibold">"{currentLinkedTransaction.description}"</strong>
                    {currentLinkedTransaction.uid ? <span className="text-sky-300"> [{currentLinkedTransaction.uid}]</span> : null}
                    ({currentLinkedTransaction.bags} bags)
                  </span>
                </div>
              </div>
            )}

            {category === "Sell" && currentLinkedTransaction && !isViewMode && (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-800/60 bg-sky-950/30 text-sky-400 animate-fade-in text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <Link2 size={14} className="animate-pulse flex-shrink-0" />
                  <span className="truncate">
                    Hard-linked to inventory entry: <strong className="font-sans text-slate-200 font-semibold">"{currentLinkedTransaction.description}"</strong>
                    {currentLinkedTransaction.uid ? <span className="text-sky-300"> [{currentLinkedTransaction.uid}]</span> : null}
                    ({currentLinkedTransaction.bags} bags)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearLink}
                  className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded border border-sky-800/80 bg-sky-950/60 hover:bg-sky-900/60 hover:text-white transition-all text-[10px] cursor-pointer"
                >
                  <Unlink size={11} /> Clear Link
                </button>
              </div>
            )}

            {/* Row: Clickable Date Field Container and Classification selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Date</label>
                <div 
                  onClick={() => {
                    if (!isViewMode) dateInputRef.current?.showPicker();
                  }}
                  className={`relative flex items-center justify-between w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus-within:border-slate-700 group select-none ${isViewMode ? "cursor-default" : "cursor-pointer"}`}
                >
                  <input
                    ref={dateInputRef}
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isViewMode}
                    className="absolute inset-0 opacity-0 w-full h-full"
                  />
                  <span className="font-mono text-slate-200 group-hover:text-white transition-colors">{date || "Select Date"}</span>
                  <Calendar size={14} className="text-slate-500 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classification</label>
                {/* Free-text input with datalist to keep dropdown suggestions while allowing typing */}
                <div>
                  <input
                    list={classificationListId}
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    disabled={isViewMode}
                    className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:border-slate-700 disabled:cursor-default disabled:text-slate-400"
                  />
                  <datalist id={classificationListId}>
                    {suggestedClassifications.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Row: Main Structural Descriptions */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
              <input
                type="text"
                placeholder="Ex. Heavy Core Timber Grade A"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isViewMode}
                className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:border-slate-700 disabled:cursor-default disabled:text-slate-400"
              />
            </div>

            {/* Row: Metadata Identity References */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tags</label>
                <input
                  type="text"
                  placeholder="clearance, batch2"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={isViewMode}
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:border-slate-700 disabled:cursor-default disabled:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receipt URL Copy</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  disabled={isViewMode}
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono disabled:cursor-default disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Row: Sizing Counts and Unit Pricing grids */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume (Bags)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={bags}
                  onChange={(e) => setBags(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isViewMode}
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono disabled:cursor-default disabled:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rate Cost (Per Bag)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isViewMode}
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono disabled:cursor-default disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Row: SEPARATED Ancillary Cost Multipliers */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/60 pb-1.5">
                Ancillary Handling Expenses
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Agent Expense Section */}
                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Agent Handling</span>
                    <label className="flex items-center gap-1.5 text-[9px] text-slate-400 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={agentSameAsBase}
                        onChange={(e) => {
                          if (isViewMode) return;
                          setAgentSameAsBase(e.target.checked);
                          if (e.target.checked) setAgentBagsCount("");
                        }}
                        disabled={isViewMode}
                        className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0 accent-emerald-500 w-3 h-3 disabled:cursor-default" 
                      />
                      Same as Base Bags
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Agent Bags</label>
                      <input
                        type="number"
                        placeholder={agentSameAsBase ? String(bags || 0) : "Qty"}
                        disabled={isViewMode || agentSameAsBase}
                        value={agentSameAsBase ? "" : agentBagsCount}
                        onChange={(e) => setAgentBagsCount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full h-8 rounded-md border border-slate-800 bg-slate-950 disabled:bg-slate-900/60 disabled:text-slate-500 px-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono disabled:cursor-default"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Cost / Bag</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Amount"
                        value={agentCostPerBag}
                        onChange={(e) => setAgentCostPerBag(e.target.value === "" ? "" : Number(e.target.value))}
                        disabled={isViewMode}
                        className="w-full h-8 rounded-md border border-slate-800 bg-slate-950 px-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono disabled:cursor-default disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Transfer Expense Section */}
                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Transfer Logistics</span>
                    <label className="flex items-center gap-1.5 text-[9px] text-slate-400 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={transferSameAsBase}
                        onChange={(e) => {
                          if (isViewMode) return;
                          setTransferSameAsBase(e.target.checked);
                          if (e.target.checked) setTransferBagsCount("");
                        }}
                        disabled={isViewMode}
                        className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0 accent-emerald-500 w-3 h-3 disabled:cursor-default" 
                      />
                      Same as Base Bags
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Transfer Bags</label>
                      <input
                        type="number"
                        placeholder={transferSameAsBase ? String(bags || 0) : "Qty"}
                        disabled={isViewMode || transferSameAsBase}
                        value={transferSameAsBase ? "" : transferBagsCount}
                        onChange={(e) => setTransferBagsCount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full h-8 rounded-md border border-slate-800 bg-slate-950 disabled:bg-slate-900/60 disabled:text-slate-500 px-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono disabled:cursor-default"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Cost / Bag</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Amount"
                        value={transferCostPerBag}
                        onChange={(e) => setTransferCostPerBag(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full h-8 rounded-md border border-slate-800 bg-slate-950 px-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Flat Other Expenditures */}
              <div className="pt-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Other Miscellaneous Flat Expenses</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={otherExp}
                  onChange={(e) => setOtherExp(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isViewMode}
                  className="w-full h-8 rounded-md border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono disabled:cursor-default disabled:text-slate-400"
                />
              </div>
            </div>

            {/* LIVE COMPUTATION COST BREAKDOWN BLOCK */}
            <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Calculator size={13} className="text-slate-500" /> Real-time Cost Matrix Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-900/60">
                  <div className="text-[9px] text-slate-500 uppercase font-sans">Base Subtotal</div>
                  <div className="text-slate-200 mt-0.5 font-bold">{calculations.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-900/60">
                  <div className="text-[9px] text-slate-500 uppercase font-sans">Agent Total ({calculations.effectiveAgentBags} b)</div>
                  <div className="text-slate-400 mt-0.5 font-bold">{calculations.agentFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-900/60">
                  <div className="text-[9px] text-slate-500 uppercase font-sans">Transfer Total ({calculations.effectiveTransferBags} b)</div>
                  <div className="text-slate-400 mt-0.5 font-bold">{calculations.transferFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-900/60">
                  <div className="text-[9px] text-slate-500 uppercase font-sans">Flat Other</div>
                  <div className="text-slate-400 mt-0.5 font-bold">{calculations.other.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold font-mono mt-2">
                <span className="text-xs text-slate-400 font-sans uppercase tracking-wide">Net Expected Outflow / Inflow</span>
                <span className={category === "Buy" ? "text-rose-400" : "text-emerald-400"}>
                  {category === "Buy" ? "-" : "+"} {calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submission Action Strip */}
            <div className="pt-2 flex justify-end gap-3 border-t border-slate-800/60">
              {isViewMode ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-xs font-bold rounded-xl bg-slate-700 text-slate-100 hover:bg-slate-600 transition-all cursor-pointer"
                >
                  Close
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                >
                  {editingId ? "Commit Updates" : "Save Transaction Record"}
                </button>
              )}
            </div>
          </form>

          {/* Right Panel: Active Term Unsold Inventory for Sell transactions */}
          {category === "Sell" && (
          <div className="lg:col-span-5 flex flex-col h-full border-l border-slate-800/80 pl-6 space-y-3 animate-fade-in">
            <div>
              <h3 className="text-xs font-bold tracking-wide text-slate-300 uppercase">
                Active Term Unsold Inventory
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                Click an asset card below to link this current operational layout execution directly to a historical stock entry.
              </p>
            </div>

            <div className="flex-1 min-h-[250px] overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/40 p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {unsoldBuyTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-600 italic text-[11px] px-4 space-y-1">
                  <span>No outstanding items available.</span>
                  <span className="text-[9px] text-slate-700 font-mono">Scope boundaries operating inside isolated workspace.</span>
                </div>
              ) : (
                unsoldBuyTransactions.map((t) => {
                  const isCurrentSelection = linkedBuyUid === (t.uid || t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleInjectShortcut(t)}
                      className={`w-full text-left p-2.5 rounded-lg border group transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrentSelection 
                          ? "border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/30 text-sky-200"
                          : "border-slate-800/60 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700/80"
                      }`}
                    >
                      <div className="truncate space-y-0.5">
                        <div className={`text-xs font-bold truncate flex items-center gap-4 ${isCurrentSelection ? "text-sky-300" : "text-slate-300 group-hover:text-white"}`}>
                          <span className="flex min-w-0 items-center gap-1.5">
                            {isCurrentSelection && <Link2 size={12} className="text-sky-400 flex-shrink-0" />}
                            <span className="font-mono truncate" title={t.uid || "No UID"}>
                              {t.uid || "No UID"}
                            </span>
                          </span>
                          {t.tags && (
                            <span
                              className="max-w-[45%] truncate rounded border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-medium text-slate-400"
                              title={t.tags}
                            >
                              {t.tags}
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <div className="truncate text-[10px] text-slate-500" title={t.description}>
                            Condition / Note: {t.description}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono tracking-tight flex items-center gap-2">
                          <span>{t.date}</span>
                          <span className="text-slate-700">•</span>
                          <span>{t.classification}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5 font-mono">
                        <div className={isCurrentSelection ? "text-sky-400 text-xs font-bold" : "text-xs font-bold text-emerald-400"}>
                          {t.bags} bags
                        </div>
                        <div className="text-[9px] text-slate-500">
                          @ {t.price}/b
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}