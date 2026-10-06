import React, { useState, useEffect } from 'react';
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
    getDocs,
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
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
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);

const PlusCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const UserPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <line x1="20" y1="8" x2="20" y2="14"></line>
        <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
);

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

// --- Authentication Screen ---
const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        if (!isLogin && !displayName.trim()) {
            setError("Please enter a display name.");
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email.trim(), password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
                await updateProfile(userCredential.user, { displayName: displayName.trim() });
                
                // Check if user was already added to a group as a placeholder/invited member
                let preassignedHouseId = null;
                const normalizedEmail = email.trim().toLowerCase();
                try {
                    const placeholderQuery = query(collection(db, 'users'), where('email', '==', normalizedEmail));
                    const placeholderSnap = await getDocs(placeholderQuery);
                    if (!placeholderSnap.empty) {
                        for (const pDoc of placeholderSnap.docs) {
                            const pData = pDoc.data();
                            if (pData.isPlaceholder && pData.houseId) {
                                preassignedHouseId = pData.houseId;
                                // Update house members list: replace placeholder UID with user's real UID
                                const houseRef = doc(db, 'houses', pData.houseId);
                                const houseDocSnap = await getDoc(houseRef);
                                if (houseDocSnap.exists()) {
                                    const currMembers = houseDocSnap.data().members || [];
                                    const updatedMembers = currMembers.map(uid => uid === pDoc.id ? userCredential.user.uid : uid);
                                    if (!updatedMembers.includes(userCredential.user.uid)) {
                                        updatedMembers.push(userCredential.user.uid);
                                    }
                                    await updateDoc(houseRef, { members: updatedMembers });
                                }
                                break;
                            }
                        }
                    }
                } catch (checkErr) {
                    console.warn("Could not check placeholder user:", checkErr);
                }

                const userDocRef = doc(db, 'users', userCredential.user.uid);
                await setDoc(userDocRef, {
                    uid: userCredential.user.uid,
                    email: normalizedEmail,
                    displayName: displayName.trim(),
                    houseId: preassignedHouseId || null,
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100 space-y-6">
                <div className="text-center">
                    <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3">
                        <UsersIcon />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Splitwise</h1>
                    <p className="text-gray-500 text-sm mt-1">Split expenses easily with housemates and friends</p>
                </div>

                <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button
                        type="button"
                        onClick={() => { setIsLogin(true); setError(''); }}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Log In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsLogin(false); setError(''); }}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleAuthAction} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Your Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="e.g. Alex Smith"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            required
                        />
                    </div>
                    
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
                    >
                        {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Create Account')}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- House / Group Setup Screen (with adding new people while creating) ---
const HouseSetupScreen = ({ user, userData }) => {
    const [tab, setTab] = useState('create'); // 'create' | 'join'
    const [groupName, setGroupName] = useState(`${userData.displayName || 'My'}'s Group`);
    const [joinCode, setJoinCode] = useState('');
    
    // New people to add while creating the group
    const [peopleToAdd, setPeopleToAdd] = useState([]);
    const [personName, setPersonName] = useState('');
    const [personEmail, setPersonEmail] = useState('');
    
    const [inputError, setInputError] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Add person to the pending creation list
    const handleAddPerson = (e) => {
        if (e) e.preventDefault();
        setInputError('');

        const trimmedName = personName.trim();
        const trimmedEmail = personEmail.trim().toLowerCase();

        if (!trimmedName) {
            setInputError("Please enter the person's name.");
            return;
        }

        // Prevent duplicate names in current pending list
        const exists = peopleToAdd.some(
            p => p.name.toLowerCase() === trimmedName.toLowerCase() || (trimmedEmail && p.email && p.email === trimmedEmail)
        );
        if (exists) {
            setInputError("A person with this name or email is already added to the list.");
            return;
        }

        if (trimmedEmail && trimmedEmail === (user.email || '').toLowerCase()) {
            setInputError("You are already included as the group creator.");
            return;
        }

        setPeopleToAdd(prev => [
            ...prev,
            {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: trimmedName,
                email: trimmedEmail
            }
        ]);

        setPersonName('');
        setPersonEmail('');
    };

    // Remove person from pending list
    const handleRemovePerson = (idToRemove) => {
        setPeopleToAdd(prev => prev.filter(p => p.id !== idToRemove));
    };

    // Create group along with all added people
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Also include pending person if typed in the input box without clicking "+ Add"
            let finalPeople = [...peopleToAdd];
            if (personName.trim()) {
                const pendingName = personName.trim();
                const pendingEmail = personEmail.trim().toLowerCase();
                const alreadyInList = finalPeople.some(p => p.name.toLowerCase() === pendingName.toLowerCase());
                if (!alreadyInList) {
                    finalPeople.push({
                        id: `${Date.now()}_last`,
                        name: pendingName,
                        email: pendingEmail
                    });
                }
            }

            const trimmedGroupName = groupName.trim() || `${userData.displayName || 'My'}'s Group`;

            // 1. Create the house document in Firestore
            const newHouseRef = await addDoc(collection(db, 'houses'), {
                name: trimmedGroupName,
                ownerId: user.uid,
                members: [user.uid],
                createdAt: serverTimestamp()
            });
            const newHouseId = newHouseRef.id;

            const memberUIDs = [user.uid];

            // 2. Process each person added to the group
            for (const person of finalPeople) {
                const pName = person.name.trim();
                const pEmail = person.email ? person.email.trim().toLowerCase() : '';
                let memberUid = null;

                // Check if user already registered with this email
                if (pEmail) {
                    const userQuery = query(collection(db, 'users'), where('email', '==', pEmail));
                    const querySnapshot = await getDocs(userQuery);
                    if (!querySnapshot.empty) {
                        const existingDoc = querySnapshot.docs[0];
                        memberUid = existingDoc.id;
                        // Assign houseId if not currently in a group
                        await updateDoc(doc(db, 'users', memberUid), { houseId: newHouseId });
                    }
                }

                // If not registered or no email, create a placeholder user in Firestore
                if (!memberUid) {
                    const newMemberRef = doc(collection(db, 'users'));
                    memberUid = newMemberRef.id;
                    await setDoc(newMemberRef, {
                        uid: memberUid,
                        displayName: pName,
                        email: pEmail,
                        houseId: newHouseId,
                        isPlaceholder: true,
                        createdBy: user.uid,
                        createdAt: serverTimestamp()
                    });
                }

                if (!memberUIDs.includes(memberUid)) {
                    memberUIDs.push(memberUid);
                }
            }

            // 3. Update the house's members array with all members
            await updateDoc(newHouseRef, { members: memberUIDs });

            // 4. Update the creator's user document with the new houseId
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { houseId: newHouseId });

        } catch (err) {
            console.error("Error creating group:", err);
            setError(err.message || 'Failed to create group');
            setIsSubmitting(false);
        }
    };

    // Join existing group using invite code
    const handleJoinGroup = async (e) => {
        e.preventDefault();
        setError('');
        if (!joinCode.trim()) {
            setError("Please enter a group invite code.");
            return;
        }

        setIsSubmitting(true);
        try {
            const houseDocRef = doc(db, 'houses', joinCode.trim());
            const houseDoc = await getDoc(houseDocRef);
            if (houseDoc.exists()) {
                await updateDoc(houseDocRef, { members: arrayUnion(user.uid) });
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, { houseId: joinCode.trim() });
            } else {
                setError("Group invite code not found. Please verify and try again.");
                setIsSubmitting(false);
            }
        } catch (err) {
            setError(err.message || "Failed to join group.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 text-center">Welcome, {userData.displayName}!</h2>
                    <p className="text-gray-500 text-center text-sm mt-1">Create a group to start splitting bills, or join an existing one.</p>
                </div>

                {/* Tabs */}
                <div className="bg-gray-100 p-1.5 rounded-2xl flex text-sm font-semibold">
                    <button
                        type="button"
                        onClick={() => { setTab('create'); setError(''); }}
                        className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${tab === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <PlusCircleIcon />
                        <span>Create New Group</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTab('join'); setError(''); }}
                        className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${tab === 'join' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <UsersIcon />
                        <span>Join with Code</span>
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                {tab === 'create' ? (
                    <form onSubmit={handleCreateGroup} className="space-y-6">
                        {/* Group Name */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Group / House Name</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="e.g., Apartment 402, Goa Trip, Flatmates"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                required
                            />
                        </div>

                        {/* Add People Section */}
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                        <UsersIcon />
                                        <span>Add People to Group</span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Add people who will share expenses with you</p>
                                </div>
                                <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                                    {1 + peopleToAdd.length} member{1 + peopleToAdd.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Creator Card */}
                            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                                        {(userData.displayName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 leading-tight">{userData.displayName} <span className="text-xs text-indigo-600 font-normal">(You)</span></p>
                                        <p className="text-xs text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium border border-indigo-100">
                                    Admin
                                </span>
                            </div>

                            {/* People Added So Far */}
                            {peopleToAdd.length > 0 && (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {peopleToAdd.map(p => (
                                        <div key={p.id} className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-gray-200 text-sm group">
                                            <div className="flex items-center space-x-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                                                    {p.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className="font-semibold text-gray-900 leading-tight truncate">{p.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{p.email || 'Offline member'}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePerson(p.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                                                title="Remove person"
                                            >
                                                <XIcon />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Person Input Row */}
                            <div className="pt-2 border-t border-indigo-100/70 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                    <input
                                        type="text"
                                        value={personName}
                                        onChange={(e) => { setPersonName(e.target.value); setInputError(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPerson(); } }}
                                        placeholder="Name (e.g. Sarah)"
                                        className="sm:col-span-2 px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <input
                                        type="email"
                                        value={personEmail}
                                        onChange={(e) => { setPersonEmail(e.target.value); setInputError(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPerson(); } }}
                                        placeholder="Email (optional)"
                                        className="sm:col-span-2 px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddPerson}
                                        className="sm:col-span-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 shadow-sm transition-colors"
                                    >
                                        <UserPlusIcon />
                                        <span>Add</span>
                                    </button>
                                </div>

                                {inputError && (
                                    <p className="text-red-500 text-xs">{inputError}</p>
                                )}
                                
                                <p className="text-[11px] text-gray-500">
                                    💡 You can add friends with just a name. If you add their email, they'll automatically join this group when they sign up!
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center space-x-2"
                        >
                            <PlusCircleIcon />
                            <span>
                                {isSubmitting 
                                    ? 'Creating Group...' 
                                    : `Create Group (${1 + peopleToAdd.length} Member${1 + peopleToAdd.length > 1 ? 's' : ''})`}
                            </span>
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleJoinGroup} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Group Invite Code</label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Paste group invite code here"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            Ask your flatmate or group creator for their group's invite code from their dashboard.
                        </p>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white rounded-xl font-semibold transition-all shadow-md text-sm"
                        >
                            {isSubmitting ? 'Joining...' : 'Join Group'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- Modal for Adding a Member to an Existing Group ---
const AddMemberModal = ({ houseId, setShowModal }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddMember = async (e) => {
        e.preventDefault();
        setError('');
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedName) {
            setError("Please enter member's name.");
            return;
        }

        setLoading(true);
        try {
            let memberUid = null;

            // Check if user already registered with this email
            if (trimmedEmail) {
                const userQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail));
                const snap = await getDocs(userQuery);
                if (!snap.empty) {
                    memberUid = snap.docs[0].id;
                    await updateDoc(doc(db, 'users', memberUid), { houseId });
                }
            }

            // Create placeholder user if not registered
            if (!memberUid) {
                const newMemberRef = doc(collection(db, 'users'));
                memberUid = newMemberRef.id;
                await setDoc(newMemberRef, {
                    uid: memberUid,
                    displayName: trimmedName,
                    email: trimmedEmail,
                    houseId: houseId,
                    isPlaceholder: true,
                    createdAt: serverTimestamp()
                });
            }

            // Add member UID to the house members array
            const houseDocRef = doc(db, 'houses', houseId);
            await updateDoc(houseDocRef, { members: arrayUnion(memberUid) });

            setShowModal(false);
        } catch (err) {
            console.error("Error adding member:", err);
            setError(err.message || "Failed to add member.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-gray-800 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center space-x-2">
                        <UserPlusIcon />
                        <span>Add Member to Group</span>
                    </h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                        <XIcon />
                    </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. John"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Email (Optional)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. john@example.com"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            If they create an account with this email later, they will automatically see this group!
                        </p>
                    </div>

                    {error && <p className="text-red-500 text-xs">{error}</p>}

                    <div className="flex justify-end space-x-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold"
                        >
                            {loading ? 'Adding...' : 'Add Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Add Expense Modal ---
const AddExpenseModal = ({ housemates, currentUserId, houseId, setShowModal }) => {
    const [description, setDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paidBy, setPaidBy] = useState(currentUserId);
    const [splitWith, setSplitWith] = useState(housemates.map(m => m.uid));
    const [submitting, setSubmitting] = useState(false);
    
    const handleAddExpense = async () => {
        const total = parseFloat(totalAmount);
        if(!description.trim() || isNaN(total) || total <= 0 || splitWith.length === 0) {
            alert("Please fill all fields correctly.");
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, `houses/${houseId}/expenses`), {
                description: description.trim(),
                totalAmount: total,
                paidBy,
                splitWith,
                createdAt: serverTimestamp()
            });
            setShowModal(false);
        } catch (err) {
            alert("Failed to add expense: " + err.message);
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-lg text-gray-800 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Add New Expense</h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                        <XIcon />
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Description</label>
                    <input 
                        type="text" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Expense description (e.g. Groceries, Dinner)" 
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Total Amount (₹)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={totalAmount} 
                        onChange={e => setTotalAmount(e.target.value)} 
                        placeholder="0.00" 
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Paid by:</label>
                    <select 
                        value={paidBy} 
                        onChange={e => setPaidBy(e.target.value)} 
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {housemates.map(mate => (
                            <option key={mate.uid} value={mate.uid}>
                                {mate.displayName || 'Member'} {mate.uid === currentUserId ? '(You)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold uppercase text-gray-600">Split with:</label>
                        <div className="space-x-2 text-xs">
                            <button 
                                type="button" 
                                onClick={() => setSplitWith(housemates.map(m => m.uid))}
                                className="text-indigo-600 hover:underline font-medium"
                            >
                                Select All
                            </button>
                            <span className="text-gray-300">|</span>
                            <button 
                                type="button" 
                                onClick={() => setSplitWith([])}
                                className="text-gray-500 hover:underline"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {housemates.map(mate => (
                            <label key={mate.uid} className={`flex items-center space-x-2 p-2.5 rounded-lg cursor-pointer text-sm transition-colors ${splitWith.includes(mate.uid) ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-medium' : 'bg-gray-50 border-gray-200 text-gray-700'} border`}>
                                <input 
                                    type="checkbox" 
                                    checked={splitWith.includes(mate.uid)} 
                                    onChange={() => {
                                        setSplitWith(prev => prev.includes(mate.uid) ? prev.filter(id => id !== mate.uid) : [...prev, mate.uid]);
                                    }} 
                                    className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                                />
                                <span className="truncate">{mate.displayName || 'Member'}</span>
                            </label>
                        ))}
                    </div>
                    {splitWith.length > 0 && totalAmount && !isNaN(parseFloat(totalAmount)) && (
                        <p className="text-xs text-indigo-600 mt-2 font-medium">
                            ₹{(parseFloat(totalAmount) / splitWith.length).toFixed(2)} per person ({splitWith.length} people)
                        </p>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                    <button onClick={() => setShowModal(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                    <button 
                        onClick={handleAddExpense} 
                        disabled={submitting}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-semibold text-sm transition-colors"
                    >
                        {submitting ? 'Adding...' : 'Add Expense'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Application Screen ---
const AppScreen = ({ user, userData, formatCurrency, formatDate }) => {
    const [currentHouse, setCurrentHouse] = useState(null);
    const [housemates, setHousemates] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // Fetch house details and housemates
    useEffect(() => {
        if (!userData?.houseId) return;
        const houseDocRef = doc(db, 'houses', userData.houseId);
        const unsubscribe = onSnapshot(houseDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const houseData = docSnap.data();
                setCurrentHouse({ id: docSnap.id, ...houseData });
                const memberUIDs = houseData.members || [];
                if (memberUIDs.length > 0) {
                    const memberPromises = memberUIDs.map(uid => getDoc(doc(db, 'users', uid)));
                    const memberDocs = await Promise.all(memberPromises);
                    const memberData = memberDocs.filter(d => d.exists()).map(mdoc => mdoc.data());
                    setHousemates(memberData);
                } else {
                    setHousemates([]);
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

    // Balance calculation
    useEffect(() => {
        if (housemates.length < 1 || !user) {
            setBalances([]);
            return;
        }

        const debts = {}; // Key: debtorId, Value: { [creditorId]: amount }

        housemates.forEach(mate => {
            if (mate?.uid) {
                debts[mate.uid] = {};
            }
        });

        expenses.forEach(expense => {
            if (expense.splitWith && expense.splitWith.length > 0) {
                const amountPerPerson = expense.totalAmount / expense.splitWith.length;
                const payerId = expense.paidBy;

                expense.splitWith.forEach(debtorId => {
                    if (payerId !== debtorId && debts[debtorId]) {
                        if (!debts[debtorId][payerId]) {
                            debts[debtorId][payerId] = 0;
                        }
                        debts[debtorId][payerId] += amountPerPerson;
                    }
                });
            }
        });
        
        const myBalances = [];
        const otherHousemates = housemates.filter(m => m && m.uid !== user.uid);
        
        otherHousemates.forEach(mate => {
            const youOweThem = debts[user.uid]?.[mate.uid] || 0;
            const theyOweYou = debts[mate.uid]?.[user.uid] || 0;
            const netBalance = theyOweYou - youOweThem;

            if (Math.abs(netBalance) > 0.01) {
                myBalances.push({
                    id: mate.uid,
                    name: mate.displayName || 'Member',
                    text: netBalance > 0 ? `${mate.displayName || 'Member'} owes you` : `You owe ${mate.displayName || 'Member'}`,
                    amount: Math.abs(netBalance),
                    isPositive: netBalance > 0
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

    const handleLeaveGroup = async () => {
        if (window.confirm("Are you sure you want to leave or switch this group?")) {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { houseId: null });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <div className="flex items-center space-x-3">
                        <h1 className="text-2xl font-black text-indigo-600 tracking-tight">
                            {currentHouse?.name || 'Group Dashboard'}
                        </h1>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-100">
                            {housemates.length} Member{housemates.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-xs text-gray-500 font-medium">Invite Code:</span>
                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono font-bold">{userData.houseId}</code>
                        <button onClick={copyHouseId} className="p-1 text-gray-500 hover:text-indigo-600 transition-colors" title="Copy Invite Code">
                            {copied ? <span className="text-xs text-green-600 font-semibold">Copied!</span> : <CopyIcon />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-indigo-100"
                    >
                        <UserPlusIcon />
                        <span>Add Person</span>
                    </button>
                    <button
                        onClick={handleLeaveGroup}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition-colors"
                        title="Leave or switch group"
                    >
                        Switch Group
                    </button>
                    <div className="h-6 w-px bg-gray-200 mx-1"></div>
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                            {(userData.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-gray-800 hidden sm:inline">{userData.displayName}</span>
                    </div>
                    <button onClick={() => signOut(auth)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors" title="Sign out">
                        <LogoutIcon />
                    </button>
                </div>
            </header>

            {/* Members bar */}
            <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-gray-400 font-semibold uppercase tracking-wider shrink-0 text-[10px]">Members:</span>
                {housemates.map(mate => (
                    <span 
                        key={mate.uid} 
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-medium shrink-0 ${mate.uid === user.uid ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'bg-gray-100 text-gray-700'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span>{mate.displayName || 'Member'} {mate.uid === user.uid ? '(You)' : ''}</span>
                    </span>
                ))}
                <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs px-2 py-1 rounded-full hover:bg-indigo-50 transition-colors shrink-0"
                >
                    <UserPlusIcon />
                    <span>+ Add</span>
                </button>
            </div>

            <main className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 max-w-7xl mx-auto w-full">
                {/* Personalized Balances Section */}
                <section className="md:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-200 h-fit space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Your Balances</h2>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settlements</span>
                    </div>
                    <div className="space-y-3">
                        {balances.length > 0 ? balances.map(balance => (
                            <div 
                                key={balance.id} 
                                className={`p-4 rounded-2xl flex justify-between items-center border ${balance.isPositive ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}
                            >
                                <div>
                                    <span className={`text-sm font-semibold block ${balance.isPositive ? 'text-emerald-900' : 'text-rose-900'}`}>
                                        {balance.text}
                                    </span>
                                </div>
                                <span className={`font-bold text-base ${balance.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {formatCurrency(balance.amount)}
                                </span>
                            </div>
                        )) : (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                                    ✓
                                </div>
                                <p className="text-gray-900 font-semibold text-sm">You are all settled up!</p>
                                <p className="text-xs text-gray-400 mt-1">No outstanding balances with group members.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Expenses Section */}
                <section className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Shared Expenses</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button 
                            onClick={() => setShowExpenseModal(true)} 
                            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors"
                        >
                            <PlusCircleIcon />
                            <span>Add Expense</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {expenses.length > 0 ? expenses.map(expense => {
                            const payer = housemates.find(m => m && m.uid === expense.paidBy);
                            const splitMembers = expense.splitWith ? expense.splitWith.map(uid => housemates.find(m => m && m.uid === uid)).filter(Boolean) : [];
                            return (
                                <div key={expense.id} className="p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-200 transition-colors">
                                    <div className="space-y-1">
                                        <p className="font-bold text-gray-900 text-sm">{expense.description}</p>
                                        <p className="text-xs text-gray-500">
                                            Paid by <span className="font-semibold text-gray-700">{payer ? payer.displayName : '...'}</span> {formatDate(expense.createdAt) && `• ${formatDate(expense.createdAt)}`}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {splitMembers.map(member => (
                                                <span key={member.uid} className="text-[11px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                                                    {member.displayName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-gray-900">{formatCurrency(expense.totalAmount)}</span>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                                <p className="text-gray-500 font-semibold text-sm">No expenses logged yet</p>
                                <p className="text-xs text-gray-400 mt-1">Click "Add Expense" above to start splitting bills!</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Modals */}
            {showExpenseModal && (
                <AddExpenseModal 
                    housemates={housemates} 
                    currentUserId={user.uid} 
                    houseId={userData.houseId} 
                    setShowModal={setShowExpenseModal} 
                />
            )}

            {showAddMemberModal && (
                <AddMemberModal 
                    houseId={userData.houseId} 
                    setShowModal={setShowAddMemberModal} 
                />
            )}
        </div>
    );
};

// --- App Root ---
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
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm font-semibold text-gray-500">Loading Splitwise...</div>
            </div>
        );
    }

    if (!user) {
        return <AuthScreen />;
    }
    
    if (!userData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm font-semibold text-gray-500">Loading user profile...</div>
            </div>
        );
    }

    if (!userData.houseId) {
        return <HouseSetupScreen user={user} userData={userData} />;
    }

    return <AppScreen user={user} userData={userData} formatCurrency={formatCurrency} formatDate={formatDate} />;
};

export default App;
