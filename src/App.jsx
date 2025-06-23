import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDCPbniU-dTP7nnoQ3kf28y-tfoClDbSKM",
  authDomain: "todo-list-7ebc8.firebaseapp.com",
  projectId: "todo-list-7ebc8",
  storageBucket: "todo-list-7ebc8.appspot.com",
  messagingSenderId: "825570379030",
  appId: "1:825570379030:web:4b4cb780ac4b3c857ffc37"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- SVG Icons ---
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;

// --- Authentication Screen ---
const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        if (!isLogin && !displayName.trim()) {
            setError("Please enter a display name.");
            return;
        }

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: displayName.trim() });
                const userDocRef = doc(db, 'users', userCredential.user.uid);
                await setDoc(userDocRef, {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: displayName.trim(),
                    houseId: null
                });
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg space-y-6">
                <h1 className="text-4xl font-bold text-center text-indigo-600">Flatmate Bill Split</h1>
                <p className="text-center text-gray-500">{isLogin ? 'Welcome back!' : 'Create your account to get started'}</p>
                <form onSubmit={handleAuthAction} className="space-y-4">
                    {!isLogin && (
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    )}
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors">
                        {isLogin ? 'Log In' : 'Sign Up'}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </form>
                <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-sm text-gray-500 hover:text-indigo-600">
                    {isLogin ? "Need an account? Sign Up" : 'Already have an account? Log In'}
                </button>
            </div>
        </div>
    );
};

// --- House Management Screen ---
const HouseSetupScreen = ({ user, userData }) => {
    const [houseId, setHouseId] = useState('');

    const createHouse = async () => {
        const newHouseRef = await addDoc(collection(db, 'houses'), {
            ownerId: user.uid,
            members: [user.uid],
            createdAt: serverTimestamp()
        });
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { houseId: newHouseRef.id });
    };
    
    const joinHouse = async () => {
        if (!houseId.trim()) return;
        const houseDocRef = doc(db, 'houses', houseId.trim());
        const houseDoc = await getDoc(houseDocRef);
        if (houseDoc.exists()) {
            await updateDoc(houseDocRef, { members: arrayUnion(user.uid) });
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { houseId: houseId.trim() });
        } else {
            alert("House ID not found.");
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg space-y-6 text-center">
                <h2 className="text-3xl font-bold">Welcome, {userData.displayName}!</h2>
                <p className="text-gray-600">To start splitting expenses, create a new house or join an existing one with an invite code.</p>
                <div className="space-y-4">
                    <button onClick={createHouse} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors">Create a New House</button>
                    <div className="flex items-center space-x-2">
                        <input value={houseId} onChange={e => setHouseId(e.target.value)} type="text" placeholder="Enter House Invite Code" className="flex-grow px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <button onClick={joinHouse} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors">Join</button>
                    </div>
                </div>
            </div>
        </div>
    )
};

// --- Add Expense Modal ---
const AddExpenseModal = ({ housemates, currentUserId, houseId, setShowModal }) => {
    const [description, setDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paidBy, setPaidBy] = useState(currentUserId);
    const [splitWith, setSplitWith] = useState(housemates.map(m => m.uid));
    
    const handleAddExpense = async () => {
        const total = parseFloat(totalAmount);
        if(!description.trim() || isNaN(total) || total <= 0 || splitWith.length === 0) {
            alert("Please fill all fields correctly.");
            return;
        }

        await addDoc(collection(db, `houses/${houseId}/expenses`), {
            description,
            totalAmount: total,
            paidBy,
            splitWith,
            createdAt: serverTimestamp()
        });
        
        setShowModal(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg text-gray-800 space-y-4">
                <h2 className="text-2xl font-bold">Add New Expense</h2>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Expense description (e.g. Groceries)" className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg"/>
                <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="Total Amount (₹)" className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg"/>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Paid by:</label>
                    <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                        {housemates.map(mate => <option key={mate.uid} value={mate.uid}>{mate.displayName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Split with:</label>
                    <div className="grid grid-cols-2 gap-2">
                        {housemates.map(mate => (
                            <label key={mate.uid} className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${splitWith.includes(mate.uid) ? 'bg-indigo-100 border-indigo-500' : 'bg-gray-100 border-gray-300'} border`}>
                                <input type="checkbox" checked={splitWith.includes(mate.uid)} onChange={() => {
                                    setSplitWith(prev => prev.includes(mate.uid) ? prev.filter(id => id !== mate.uid) : [...prev, mate.uid])
                                }} className="form-checkbox h-5 w-5 text-indigo-600 rounded"/>
                                <span>{mate.displayName}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end space-x-3">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleAddExpense} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">Add Expense</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Application Screen ---
const AppScreen = ({ user, userData, formatCurrency, formatDate }) => {
    const [housemates, setHousemates] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // Fetch housemates
    useEffect(() => {
        if (!userData?.houseId) return;
        const houseDocRef = doc(db, 'houses', userData.houseId);
        const unsubscribe = onSnapshot(houseDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const memberUIDs = docSnap.data().members;
                if (memberUIDs && memberUIDs.length > 0) {
                    const memberPromises = memberUIDs.map(uid => getDoc(doc(db, 'users', uid)));
                    const memberDocs = await Promise.all(memberPromises);
                    const memberData = memberDocs.filter(d => d.exists()).map(mdoc => mdoc.data());
                    setHousemates(memberData);
                }
            }
        });
        return unsubscribe;
    }, [userData]);

    // Fetch expenses
    useEffect(() => {
        if (!userData?.houseId) return;
        const expensesQuery = query(collection(db, `houses/${userData.houseId}/expenses`), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
            const expenseData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            setExpenses(expenseData);
        });
        return unsubscribe;
    }, [userData]);

    // --- New, Corrected Person-to-Person Balance Calculation ---
    useEffect(() => {
        if (housemates.length < 1 || !user) {
            setBalances([]);
            return;
        }

        const debts = {}; // Key: debtorId, Value: { [creditorId]: amount }

        // Initialize debts structure
        housemates.forEach(mate => {
            debts[mate.uid] = {};
        });

        // Calculate all one-way debts
        expenses.forEach(expense => {
            if (expense.splitWith && expense.splitWith.length > 0) {
                const amountPerPerson = expense.totalAmount / expense.splitWith.length;
                const payerId = expense.paidBy;

                expense.splitWith.forEach(debtorId => {
                    if (payerId !== debtorId) {
                        if (!debts[debtorId][payerId]) {
                            debts[debtorId][payerId] = 0;
                        }
                        debts[debtorId][payerId] += amountPerPerson;
                    }
                });
            }
        });
        
        // Calculate the current user's net balance with each housemate
        const myBalances = [];
        const otherHousemates = housemates.filter(m => m.uid !== user.uid);
        
        otherHousemates.forEach(mate => {
            const youOweThem = debts[user.uid]?.[mate.uid] || 0;
            const theyOweYou = debts[mate.uid]?.[user.uid] || 0;
            const netBalance = theyOweYou - youOweThem;

            if (Math.abs(netBalance) > 0.01) {
                myBalances.push({
                    id: mate.uid,
                    text: netBalance > 0 ? `${mate.displayName} owes you` : `You owe ${mate.displayName}`,
                    amount: Math.abs(netBalance)
                });
            }
        });

        setBalances(myBalances);
    }, [expenses, housemates, user]);
    
    const copyHouseId = () => {
        const houseId = userData?.houseId;
        if (houseId) {
            const el = document.createElement('textarea');
            el.value = houseId;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-600">House Dashboard</h1>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">House Invite Code:</span>
                        <code className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">{userData.houseId}</code>
                        <button onClick={copyHouseId} className="p-1 text-gray-500 hover:text-indigo-600">
                            {copied ? <span className="text-xs text-green-500">Copied!</span> : <CopyIcon />}
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-700">Welcome, {userData.displayName}</span>
                    <button onClick={() => signOut(auth)} className="text-gray-500 hover:text-indigo-600"><LogoutIcon /></button>
                </div>
            </header>

            <main className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Personalized Balances Section */}
                <section className="md:col-span-1 bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Your Balances</h2>
                    <div className="space-y-3">
                        {balances.length > 0 ? balances.map(balance => (
                            <div key={balance.id} className={`p-3 rounded-lg flex justify-between items-center ${balance.text.includes('You owe') ? 'bg-red-50' : 'bg-green-50'}`}>
                                <span className={`${balance.text.includes('You owe') ? 'text-red-700' : 'text-green-700'}`}>{balance.text}</span>
                                <span className="font-semibold">{formatCurrency(balance.amount)}</span>
                            </div>
                        )) : (
                             <p className="text-gray-500 text-center mt-4">You are all settled up!</p>
                        )}
                    </div>
                </section>

                {/* Expenses Section */}
                <section className="md:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Shared Expenses</h2>
                        <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">
                            <PlusCircleIcon /><span>Add Expense</span>
                        </button>
                    </div>
                    <div className="space-y-3">
                        {expenses.length > 0 ? expenses.map(expense => {
                             const payer = housemates.find(m => m && m.uid === expense.paidBy);
                             const splitMembers = expense.splitWith ? expense.splitWith.map(uid => housemates.find(m => m && m.uid === uid)).filter(Boolean) : [];
                             return (
                                <div key={expense.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center border">
                                    <div>
                                        <p className="font-semibold">{expense.description}</p>
                                        <p className="text-sm text-gray-500">Paid by {payer ? payer.displayName : '...'} on {formatDate(expense.createdAt)}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {splitMembers.map(member => (
                                                <span key={member.uid} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{member.displayName}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold">{formatCurrency(expense.totalAmount)}</span>
                                </div>
                             )
                        }) : (
                            <p className="text-gray-500 text-center mt-8">No expenses yet. Add the first one!</p>
                        )}
                    </div>
                </section>
            </main>
            {showModal && <AddExpenseModal housemates={housemates} currentUserId={user.uid} houseId={userData.houseId} setShowModal={setShowModal} />}
        </div>
    )
};

// --- App Root (Corrected Logic) ---
const App = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    }

    function formatDate(timestamp) {
        if (!timestamp || typeof timestamp.toDate !== 'function') return '';
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(timestamp.toDate());
    }

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }
                    setUser(currentUser);
                    setLoading(false);
                });
                return () => unsubscribeSnapshot();
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    if (loading) {
        return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading App...</div>;
    }

    if (!user) {
        return <AuthScreen />;
    }
    
    if (!userData) {
         return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading User Data...</div>;
    }

    if (!userData.houseId) {
        return <HouseSetupScreen user={user} userData={userData} />;
    }

    return <AppScreen user={user} userData={userData} formatCurrency={formatCurrency} formatDate={formatDate} />;
};

export default App;
