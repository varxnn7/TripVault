import { useState, useEffect, useRef } from 'react';
import { IoAdd, IoTrash, IoCheckmark, IoClose, IoShuffle } from 'react-icons/io5';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  subscribeToPackingItems,
  addPackingItem,
  updatePackingItem,
  deletePackingItem,
} from '../../firebase/firestore';
import './PackingTab.css';

// ─────────────────────────────────────────────────────────
//  Categories
// ─────────────────────────────────────────────────────────
const CATEGORIES = [
  'Documents',
  'Clothing',
  'Electronics',
  'Toiletries',
  'Medicines',
  'Accessories',
  'Other',
];

const CATEGORY_EMOJI = {
  Documents:   '🪪',
  Clothing:    '👕',
  Electronics: '💻',
  Toiletries:  '🧴',
  Medicines:   '💊',
  Accessories: '🎒',
  Other:       '📦',
};

// ─────────────────────────────────────────────────────────
//  Packing Templates
// ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'beach',
    label: '🏖️ Beach Trip',
    items: [
      { title: 'Passport / ID', category: 'Documents' },
      { title: 'Travel Tickets', category: 'Documents' },
      { title: 'Swimwear', category: 'Clothing' },
      { title: 'Beach Shorts', category: 'Clothing' },
      { title: 'Flip Flops', category: 'Clothing' },
      { title: 'Cover-Up / Sarong', category: 'Clothing' },
      { title: 'Sunglasses', category: 'Accessories' },
      { title: 'Sun Hat', category: 'Accessories' },
      { title: 'Waterproof Bag', category: 'Accessories' },
      { title: 'Beach Towel', category: 'Accessories' },
      { title: 'Sunscreen SPF 50+', category: 'Toiletries' },
      { title: 'After-Sun Lotion', category: 'Toiletries' },
      { title: 'Insect Repellent', category: 'Toiletries' },
      { title: 'Phone & Charger', category: 'Electronics' },
      { title: 'Waterproof Camera', category: 'Electronics' },
      { title: 'Power Bank', category: 'Electronics' },
      { title: 'Motion Sickness Pills', category: 'Medicines' },
      { title: 'First Aid Kit', category: 'Medicines' },
    ],
  },
  {
    id: 'business',
    label: '💼 Business Trip',
    items: [
      { title: 'Passport / ID', category: 'Documents' },
      { title: 'Business Cards', category: 'Documents' },
      { title: 'Conference Tickets', category: 'Documents' },
      { title: 'Hotel Booking Printout', category: 'Documents' },
      { title: 'Formal Shirts', category: 'Clothing' },
      { title: 'Formal Trousers / Skirt', category: 'Clothing' },
      { title: 'Blazer / Suit', category: 'Clothing' },
      { title: 'Formal Shoes', category: 'Clothing' },
      { title: 'Belt & Tie', category: 'Accessories' },
      { title: 'Watch', category: 'Accessories' },
      { title: 'Laptop & Charger', category: 'Electronics' },
      { title: 'Laptop Bag', category: 'Electronics' },
      { title: 'Phone & Charger', category: 'Electronics' },
      { title: 'Power Bank', category: 'Electronics' },
      { title: 'Universal Adapter', category: 'Electronics' },
      { title: 'Notebook & Pen', category: 'Other' },
      { title: 'Toiletry Kit', category: 'Toiletries' },
    ],
  },
  {
    id: 'adventure',
    label: '🏔️ Adventure / Trek',
    items: [
      { title: 'Passport / ID', category: 'Documents' },
      { title: 'Trail Map / Permits', category: 'Documents' },
      { title: 'Moisture-Wicking T-Shirts', category: 'Clothing' },
      { title: 'Hiking Pants', category: 'Clothing' },
      { title: 'Thermal Base Layer', category: 'Clothing' },
      { title: 'Rain Jacket / Windbreaker', category: 'Clothing' },
      { title: 'Hiking Boots', category: 'Clothing' },
      { title: 'Warm Socks', category: 'Clothing' },
      { title: 'Trekking Pole', category: 'Accessories' },
      { title: 'Backpack (60L)', category: 'Accessories' },
      { title: 'Headlamp + Batteries', category: 'Accessories' },
      { title: 'Sleeping Bag', category: 'Accessories' },
      { title: 'Tent', category: 'Accessories' },
      { title: 'Compass', category: 'Accessories' },
      { title: 'Sunglasses', category: 'Accessories' },
      { title: 'GPS / Phone & Charger', category: 'Electronics' },
      { title: 'Solar Charger', category: 'Electronics' },
      { title: 'Satellite Communicator', category: 'Electronics' },
      { title: 'First Aid Kit', category: 'Medicines' },
      { title: 'Blister Pads', category: 'Medicines' },
      { title: 'Energy Bars / Snacks', category: 'Other' },
      { title: 'Water Purification Tablets', category: 'Other' },
      { title: 'Sunscreen', category: 'Toiletries' },
    ],
  },
  {
    id: 'family',
    label: '👨‍👩‍👧 Family Holiday',
    items: [
      { title: 'Passports (All Members)', category: 'Documents' },
      { title: 'Travel Insurance', category: 'Documents' },
      { title: 'Hotel & Flight Bookings', category: 'Documents' },
      { title: 'Casual Clothes (All)', category: 'Clothing' },
      { title: 'Kids Comfortable Shoes', category: 'Clothing' },
      { title: 'Swimwear (All)', category: 'Clothing' },
      { title: 'Baby Carrier / Stroller', category: 'Accessories' },
      { title: 'Kids Toys / Coloring Books', category: 'Accessories' },
      { title: 'Camera', category: 'Electronics' },
      { title: 'Tablet for Kids', category: 'Electronics' },
      { title: 'Phone Chargers', category: 'Electronics' },
      { title: 'Sunscreen (Kid-Safe)', category: 'Toiletries' },
      { title: 'Baby Wipes', category: 'Toiletries' },
      { title: 'Shampoo & Conditioner', category: 'Toiletries' },
      { title: 'Children\'s Medicines', category: 'Medicines' },
      { title: 'Pain Relievers', category: 'Medicines' },
      { title: 'Bandages & Antiseptic', category: 'Medicines' },
      { title: 'Snacks for Kids', category: 'Other' },
    ],
  },
  {
    id: 'backpacking',
    label: '🎒 Solo Backpacking',
    items: [
      { title: 'Passport & Visa', category: 'Documents' },
      { title: 'Travel Insurance', category: 'Documents' },
      { title: 'Hostel Bookings', category: 'Documents' },
      { title: 'Emergency Contacts', category: 'Documents' },
      { title: '3x T-Shirts (Quick Dry)', category: 'Clothing' },
      { title: '2x Pants', category: 'Clothing' },
      { title: 'Underwear & Socks', category: 'Clothing' },
      { title: 'Light Jacket', category: 'Clothing' },
      { title: 'Comfortable Walking Shoes', category: 'Clothing' },
      { title: 'Backpack (40L)', category: 'Accessories' },
      { title: 'Day Pack (15L)', category: 'Accessories' },
      { title: 'Travel Pillow', category: 'Accessories' },
      { title: 'Padlock (for hostel)', category: 'Accessories' },
      { title: 'Earplugs & Eye Mask', category: 'Accessories' },
      { title: 'Money Belt / Pouch', category: 'Accessories' },
      { title: 'Unlocked Phone & Charger', category: 'Electronics' },
      { title: 'Power Bank', category: 'Electronics' },
      { title: 'Headphones', category: 'Electronics' },
      { title: 'Universal Adapter', category: 'Electronics' },
      { title: 'Basic Toiletry Kit', category: 'Toiletries' },
      { title: 'Microfiber Towel', category: 'Toiletries' },
      { title: 'Hand Sanitiser', category: 'Toiletries' },
      { title: 'Diarrhea Tablets', category: 'Medicines' },
      { title: 'Pain Killers', category: 'Medicines' },
      { title: 'Guidebook', category: 'Other' },
    ],
  },
];

// ─────────────────────────────────────────────────────────
//  Individual item row
// ─────────────────────────────────────────────────────────
const PackingItem = ({ item, onToggle, onDelete, deleting }) => (
  <div className={`pk-item ${item.checked ? 'pk-item-checked' : ''} ${deleting ? 'pk-item-deleting' : ''}`}>
    <button
      className={`pk-checkbox ${item.checked ? 'pk-checkbox-done' : ''}`}
      onClick={() => onToggle(item)}
      aria-label={item.checked ? 'Mark as unpacked' : 'Mark as packed'}
    >
      {item.checked && <IoCheckmark />}
    </button>
    <span className="pk-item-title">{item.title}</span>
    <button className="pk-delete-btn" onClick={() => onDelete(item.id)} aria-label="Remove item">
      <IoClose />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────
//  Category group
// ─────────────────────────────────────────────────────────
const CategoryGroup = ({ category, items, onToggle, onDelete, deletingIds }) => {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = items.filter((i) => i.checked).length;

  return (
    <div className="pk-group">
      <button className="pk-group-header" onClick={() => setCollapsed((p) => !p)}>
        <span className="pk-group-emoji">{CATEGORY_EMOJI[category] || '📦'}</span>
        <span className="pk-group-name">{category}</span>
        <span className="pk-group-count">{doneCount}/{items.length}</span>
        <span className={`pk-group-chevron ${collapsed ? 'pk-chevron-up' : ''}`}>›</span>
      </button>

      {!collapsed && (
        <div className="pk-group-items">
          {items.map((item) => (
            <PackingItem
              key={item.id}
              item={item}
              onToggle={onToggle}
              onDelete={onDelete}
              deleting={deletingIds.has(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
//  Progress ring
// ─────────────────────────────────────────────────────────
const ProgressRing = ({ total, done }) => {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="pk-ring-wrap" title={`${pct}% packed`}>
      <svg className="pk-ring" width="72" height="72" viewBox="0 0 72 72">
        <circle className="pk-ring-track" cx="36" cy="36" r={radius} />
        <circle
          className="pk-ring-fill"
          cx="36" cy="36" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="pk-ring-label">
        <span className="pk-ring-pct">{pct}%</span>
        <span className="pk-ring-sub">packed</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
//  Main PackingTab
// ─────────────────────────────────────────────────────────
const PackingTab = ({ tripId }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Other');
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(null);
  const inputRef = useRef(null);

  // Real-time Firestore subscription
  useEffect(() => {
    const unsub = subscribeToPackingItems(user.uid, tripId, setItems);
    return () => unsub();
  }, [user, tripId]);

  // Focus input when add form opens
  useEffect(() => {
    if (showAddForm) setTimeout(() => inputRef.current?.focus(), 80);
  }, [showAddForm]);

  const total = items.length;
  const done = items.filter((i) => i.checked).length;

  // Group items by category, unchecked before checked
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items
      .filter((i) => i.category === cat)
      .sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  // Items with unknown / uncategorised category
  const otherItems = items.filter(
    (i) => !CATEGORIES.includes(i.category)
  ).sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
  if (otherItems.length > 0) grouped['Other'] = [...(grouped['Other'] || []), ...otherItems];

  // ── Handlers ──────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await addPackingItem(user.uid, tripId, {
        title: newTitle.trim(),
        category: newCategory,
      });
      setNewTitle('');
      setShowAddForm(false);
      addToast('Item added', 'success');
    } catch {
      addToast('Failed to add item', 'error');
    }
    setAdding(false);
  };

  const handleToggle = async (item) => {
    try {
      await updatePackingItem(user.uid, tripId, item.id, { checked: !item.checked });
    } catch {
      addToast('Could not update item', 'error');
    }
  };

  const handleDelete = async (itemId) => {
    setDeletingIds((prev) => new Set(prev).add(itemId));
    try {
      await deletePackingItem(user.uid, tripId, itemId);
    } catch {
      addToast('Failed to remove item', 'error');
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleClearChecked = async () => {
    const checkedItems = items.filter((i) => i.checked);
    for (const item of checkedItems) {
      await deletePackingItem(user.uid, tripId, item.id);
    }
    addToast(`${checkedItems.length} packed item${checkedItems.length > 1 ? 's' : ''} cleared`, 'success');
  };

  const applyTemplate = async (template) => {
    setLoadingTemplate(template.id);
    const existingTitles = new Set(items.map((i) => i.title.toLowerCase()));
    const newItems = template.items.filter(
      (t) => !existingTitles.has(t.title.toLowerCase())
    );
    try {
      await Promise.all(
        newItems.map((item) => addPackingItem(user.uid, tripId, item))
      );
      const skipped = template.items.length - newItems.length;
      const msg = skipped > 0
        ? `Added ${newItems.length} items (${skipped} already exist)`
        : `Added ${newItems.length} items from ${template.label}`;
      addToast(msg, 'success');
    } catch {
      addToast('Failed to apply template', 'error');
    }
    setLoadingTemplate(null);
    setShowTemplates(false);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="pk-tab">
      {/* ── Header bar ── */}
      <div className="pk-header">
        <h2 className="text-h3">Packing List</h2>
        <div className="pk-header-actions">
          {done > 0 && (
            <button className="pk-clear-btn" onClick={handleClearChecked}>
              <IoTrash /> Clear Packed
            </button>
          )}
          <button
            className={`pk-template-btn ${showTemplates ? 'pk-template-btn-active' : ''}`}
            onClick={() => setShowTemplates((p) => !p)}
          >
            <IoShuffle /> Templates
          </button>
          <button
            className={`pk-add-trigger ${showAddForm ? 'pk-add-trigger-active' : ''}`}
            onClick={() => setShowAddForm((p) => !p)}
          >
            <IoAdd />
          </button>
        </div>
      </div>

      {/* ── Template picker ── */}
      {showTemplates && (
        <div className="pk-templates glass animate-fade-in">
          <p className="pk-templates-title">Choose a template — existing items won't be duplicated</p>
          <div className="pk-template-grid">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                className="pk-template-card"
                onClick={() => applyTemplate(tpl)}
                disabled={loadingTemplate !== null}
              >
                {loadingTemplate === tpl.id ? (
                  <span className="pk-tpl-loading">Adding…</span>
                ) : (
                  <>
                    <span className="pk-tpl-label">{tpl.label}</span>
                    <span className="pk-tpl-count">{tpl.items.length} items</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Add form ── */}
      {showAddForm && (
        <form className="pk-add-form glass animate-fade-in-down" onSubmit={handleAdd}>
          <input
            ref={inputRef}
            className="pk-new-input"
            placeholder="Item name (e.g. Passport, Charger…)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <div className="pk-cat-picker">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`pk-cat-chip ${newCategory === cat ? 'pk-cat-chip-active' : ''}`}
                onClick={() => setNewCategory(cat)}
              >
                {CATEGORY_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
          <div className="pk-form-actions">
            <button type="button" className="pk-cancel-btn" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="pk-submit-btn" disabled={adding}>
              {adding ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </form>
      )}

      {/* ── Empty state ── */}
      {total === 0 && !showAddForm && !showTemplates && (
        <div className="pk-empty">
          <span className="pk-empty-icon">🧳</span>
          <p className="pk-empty-title">Your packing list is empty</p>
          <p className="pk-empty-sub">Start with a template or add items manually</p>
          <div className="pk-empty-btns">
            <button className="pk-template-btn" onClick={() => setShowTemplates(true)}>
              <IoShuffle /> Pick a Template
            </button>
            <button className="pk-add-trigger" onClick={() => setShowAddForm(true)}>
              <IoAdd />
            </button>
          </div>
        </div>
      )}

      {/* ── Progress + list ── */}
      {total > 0 && (
        <div className="pk-content animate-fade-in">
          {/* Progress summary */}
          <div className="pk-progress-bar glass">
            <ProgressRing total={total} done={done} />
            <div className="pk-progress-info">
              <p className="pk-progress-headline">
                {done === total ? '✅ All packed! Have a great trip 🎉' : `${done} of ${total} items packed`}
              </p>
              <div className="pk-track">
                <div
                  className="pk-track-fill"
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>
              <p className="pk-progress-sub">{total - done} items remaining</p>
            </div>
          </div>

          {/* Category groups */}
          <div className="pk-groups">
            {Object.entries(grouped).map(([cat, catItems]) => (
              <CategoryGroup
                key={cat}
                category={cat}
                items={catItems}
                onToggle={handleToggle}
                onDelete={handleDelete}
                deletingIds={deletingIds}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingTab;
