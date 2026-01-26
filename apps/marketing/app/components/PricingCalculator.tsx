"use client";

import { useState, useMemo } from "react";

// Pricing constants
const PRICING = {
  core: {
    base: 19,
    includedUsers: 3,
    extraUserPrice: 4,
    includedEntities: 1,
  },
  modules: {
    crm: { price: 19, label: "CRM Module", description: "Jobs + Invoicing (300 invoices/mo included)" },
    certificates: { price: 15, label: "Certificates Module", description: "Digital certs (150 certs/mo included)" },
    portal: { price: 7, label: "Customer Portal", description: "Client self-service portal" },
    tools: { price: 7, label: "Tools Pack", description: "Cable calc, point counter & more" },
  },
  addons: {
    extraEntity: 15, // per entity
    storageBlock: 5, // per 50GB
  },
  pro: {
    base: 79,
    includedUsers: 10,
    includedEntities: 2,
    extraUserPrice: 3,
    extraEntityPrice: 15,
    includes: ["crm", "certificates", "portal", "tools"] as const,
  },
};

export function PricingCalculator() {
  const [usePro, setUsePro] = useState(true);
  const [users, setUsers] = useState(5);
  const [entities, setEntities] = useState(1);
  const [storage, setStorage] = useState(0);
  const [modules, setModules] = useState({
    crm: true,
    certificates: true,
    portal: false,
    tools: false,
  });

  const calculation = useMemo(() => {
    const breakdown: { name: string; price: number }[] = [];
    let total = 0;

    if (usePro) {
      // Pro bundle pricing
      breakdown.push({ name: "Quantract Pro (includes CRM, Certs, Portal, Tools)", price: PRICING.pro.base });
      total += PRICING.pro.base;

      // Extra users beyond included
      const extraUsers = Math.max(0, users - PRICING.pro.includedUsers);
      if (extraUsers > 0) {
        const userCost = extraUsers * PRICING.pro.extraUserPrice;
        breakdown.push({ name: `Extra users (${extraUsers} x £${PRICING.pro.extraUserPrice})`, price: userCost });
        total += userCost;
      }

      // Extra entities beyond included (2 in Pro)
      const extraEntities = Math.max(0, entities - PRICING.pro.includedEntities);
      if (extraEntities > 0) {
        const entityCost = extraEntities * PRICING.pro.extraEntityPrice;
        breakdown.push({ name: `Extra legal entities (${extraEntities} x £${PRICING.pro.extraEntityPrice})`, price: entityCost });
        total += entityCost;
      }
    } else {
      // Core + modules pricing
      breakdown.push({ name: "Quantract Core", price: PRICING.core.base });
      total += PRICING.core.base;

      // Extra users beyond included (3 in Core)
      const extraUsers = Math.max(0, users - PRICING.core.includedUsers);
      if (extraUsers > 0) {
        const userCost = extraUsers * PRICING.core.extraUserPrice;
        breakdown.push({ name: `Extra users (${extraUsers} x £${PRICING.core.extraUserPrice})`, price: userCost });
        total += userCost;
      }

      // Modules
      if (modules.crm) {
        breakdown.push({ name: "CRM Module", price: PRICING.modules.crm.price });
        total += PRICING.modules.crm.price;
      }
      if (modules.certificates) {
        breakdown.push({ name: "Certificates Module", price: PRICING.modules.certificates.price });
        total += PRICING.modules.certificates.price;
      }
      if (modules.portal) {
        breakdown.push({ name: "Customer Portal", price: PRICING.modules.portal.price });
        total += PRICING.modules.portal.price;
      }
      if (modules.tools) {
        breakdown.push({ name: "Tools Pack", price: PRICING.modules.tools.price });
        total += PRICING.modules.tools.price;
      }

      // Extra entities beyond included (1 in Core)
      const extraEntities = Math.max(0, entities - PRICING.core.includedEntities);
      if (extraEntities > 0) {
        const entityCost = extraEntities * PRICING.addons.extraEntity;
        breakdown.push({ name: `Multi-Entity Billing (${extraEntities} extra)`, price: entityCost });
        total += entityCost;
      }
    }

    // Storage (applies to both)
    if (storage > 0) {
      const storageCost = storage * PRICING.addons.storageBlock;
      breakdown.push({ name: `Extra Storage (${storage} x 50GB)`, price: storageCost });
      total += storageCost;
    }

    return { breakdown, total };
  }, [usePro, users, entities, storage, modules]);

  return (
    <div className="calculator">
      <h3>Estimate Your Monthly Cost</h3>
      <div className="calculator-grid">
        <div className="calculator-inputs">
          {/* Plan selector */}
          <div className="calc-row" style={{ background: usePro ? "rgba(22, 163, 74, 0.1)" : undefined }}>
            <label>Use Pro Bundle (Best Value)</label>
            <div className="calc-toggle">
              <input
                type="checkbox"
                checked={usePro}
                onChange={(e) => setUsePro(e.target.checked)}
              />
            </div>
          </div>

          {/* Users */}
          <div className="calc-row">
            <label>
              Users
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>
                {usePro ? "10 included, £3/extra" : "3 included, £4/extra"}
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={users}
              onChange={(e) => setUsers(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Legal Entities */}
          <div className="calc-row">
            <label>
              Legal Entities
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>
                {usePro ? "2 included" : "1 included"}, £15/extra
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={entities}
              onChange={(e) => setEntities(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Modules (only shown for Core) */}
          {!usePro && (
            <>
              <div className="calc-row">
                <label>
                  CRM Module
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Jobs & Invoicing</span>
                </label>
                <div className="calc-toggle">
                  <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£19/mo</span>
                  <input
                    type="checkbox"
                    checked={modules.crm}
                    onChange={(e) => setModules({ ...modules, crm: e.target.checked })}
                  />
                </div>
              </div>
              <div className="calc-row">
                <label>
                  Certificates Module
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Digital certificates</span>
                </label>
                <div className="calc-toggle">
                  <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£15/mo</span>
                  <input
                    type="checkbox"
                    checked={modules.certificates}
                    onChange={(e) => setModules({ ...modules, certificates: e.target.checked })}
                  />
                </div>
              </div>
              <div className="calc-row">
                <label>
                  Customer Portal
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Client self-service</span>
                </label>
                <div className="calc-toggle">
                  <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£7/mo</span>
                  <input
                    type="checkbox"
                    checked={modules.portal}
                    onChange={(e) => setModules({ ...modules, portal: e.target.checked })}
                  />
                </div>
              </div>
              <div className="calc-row">
                <label>
                  Tools Pack
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Cable calc & more</span>
                </label>
                <div className="calc-toggle">
                  <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£7/mo</span>
                  <input
                    type="checkbox"
                    checked={modules.tools}
                    onChange={(e) => setModules({ ...modules, tools: e.target.checked })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Extra Storage */}
          <div className="calc-row">
            <label>
              Extra Storage
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>
                {usePro ? "100GB included" : "Standard included"}, £5/50GB
              </span>
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={storage}
              onChange={(e) => setStorage(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
        </div>

        <div className="calculator-result">
          <div className="result-total">
            <div className="label">Estimated Monthly Total</div>
            <div className="amount">£{calculation.total}</div>
            <div className="period">/month + VAT</div>
          </div>
          <ul className="result-breakdown">
            {calculation.breakdown.map((item, i) => (
              <li key={i}>
                <span className="item-name">{item.name}</span>
                <span className="item-price">£{item.price}</span>
              </li>
            ))}
          </ul>
          {usePro && (
            <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>
              Includes: 500 invoices/mo, 300 certificates/mo, 100GB storage
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
