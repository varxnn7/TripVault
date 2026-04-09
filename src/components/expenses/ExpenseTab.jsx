import { useState, useEffect } from 'react';
import { IoAdd, IoTrash, IoWallet } from 'react-icons/io5';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { subscribeToExpenses, addExpense, deleteExpense } from '../../firebase/firestore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import EmptyState from '../ui/EmptyState';
import './ExpenseTab.css';

const CATEGORIES = ['Transport', 'Accommodation', 'Food', 'Activities', 'Shopping', 'Other'];

const ExpenseTab = ({ tripId, currency, trip }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Food', date: '', notes: '' });

  useEffect(() => {
    const unsub = subscribeToExpenses(user.uid, tripId, setExpenses);
    return () => unsub();
  }, [user, tripId]);

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const budget = trip?.budget || 0;
  const remaining = budget - totalSpent;
  const percentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  const categoryTotals = CATEGORIES.map((cat) => ({
    name: cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + (Number(e.amount) || 0), 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    setLoading(true);
    try {
      await addExpense(user.uid, tripId, {
        ...form,
        amount: Number(form.amount),
        date: form.date ? new Date(form.date) : new Date(),
      });
      setShowModal(false);
      setForm({ title: '', amount: '', category: 'Food', date: '', notes: '' });
      addToast('Expense added', 'success');
    } catch {
      addToast('Failed to add expense', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (expenseId) => {
    try {
      await deleteExpense(user.uid, tripId, expenseId);
      addToast('Expense removed', 'success');
    } catch {
      addToast('Failed to remove expense', 'error');
    }
  };

  return (
    <div className="expense-tab">
      <div className="tab-header">
        <h2 className="text-h3">Expenses</h2>
        <Button size="sm" icon={<IoAdd />} onClick={() => setShowModal(true)}>Add Expense</Button>
      </div>

      {/* Budget Overview */}
      {(budget > 0 || totalSpent > 0) && (
        <div className="budget-overview glass">
          <div className="budget-stats">
            <div className="budget-stat">
              <span className="text-label">Total Spent</span>
              <span className="budget-amount">{formatCurrency(totalSpent, currency)}</span>
            </div>
            {budget > 0 && (
              <>
                <div className="budget-stat">
                  <span className="text-label">Budget</span>
                  <span className="budget-amount">{formatCurrency(budget, currency)}</span>
                </div>
                <div className="budget-stat">
                  <span className="text-label">Remaining</span>
                  <span className={`budget-amount ${remaining < 0 ? 'over-budget' : ''}`}>
                    {formatCurrency(Math.abs(remaining), currency)}
                    {remaining < 0 && ' over'}
                  </span>
                </div>
              </>
            )}
          </div>
          {budget > 0 && (
            <div className="budget-bar-container">
              <div className="budget-bar">
                <div
                  className={`budget-bar-fill ${percentage >= 100 ? 'bar-over' : percentage >= 75 ? 'bar-warning' : ''}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="budget-percentage">{Math.round(percentage)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Category Breakdown */}
      {categoryTotals.length > 0 && (
        <div className="category-breakdown glass">
          <span className="text-label">Category Breakdown</span>
          <div className="category-list">
            {categoryTotals.map((cat) => (
              <div key={cat.name} className="category-item">
                <div className="category-info">
                  <span className="category-name">{cat.name}</span>
                  <span className="category-amount">{formatCurrency(cat.total, currency)}</span>
                </div>
                <div className="category-bar">
                  <div
                    className="category-bar-fill"
                    style={{ width: `${totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List */}
      {expenses.length > 0 ? (
        <div className="expense-list">
          {expenses.map((exp) => (
            <div key={exp.id} className="expense-item glass animate-fade-in">
              <div className="expense-info">
                <div className="expense-main">
                  <h4 className="expense-title">{exp.title}</h4>
                  <span className="expense-category">{exp.category}</span>
                </div>
                {exp.notes && <p className="expense-notes">{exp.notes}</p>}
                <span className="expense-date">{formatDate(exp.date || exp.createdAt)}</span>
              </div>
              <div className="expense-right">
                <span className="expense-amount">{formatCurrency(exp.amount, currency)}</span>
                <button className="expense-delete" onClick={() => handleDelete(exp.id)}>
                  <IoTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<IoWallet />}
          title="No expenses yet"
          description="Track your trip spending"
          action={<Button icon={<IoAdd />} onClick={() => setShowModal(true)}>Add First Expense</Button>}
        />
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Expense" size="sm">
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Lunch at Cafe" required />
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" required />
          <div className="form-field">
            <label className="input-label">Category</label>
            <div className="category-options">
              {CATEGORIES.map((cat) => (
                <button key={cat} type="button"
                  className={`category-option ${form.category === cat ? 'category-selected' : ''}`}
                  onClick={() => setForm({ ...form, category: cat })}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." />
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpenseTab;
