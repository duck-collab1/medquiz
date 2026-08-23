import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { syncFromCloud } from "../services/progressService";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth!, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }
      // Kéo tiến trình quiz + lịch ôn từ server về máy này TRƯỚC khi cho
      // phép các trang đọc localStorage - nếu không, trang có thể render
      // với dữ liệu cũ của riêng máy này trước khi kịp đồng bộ xong.
      syncFromCloud(firebaseUser.uid)
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    });
    return unsubscribe;
  }, []);

  async function register(
    email: string,
    password: string,
    displayName: string,
  ) {
    const credential = await createUserWithEmailAndPassword(
      auth!,
      email,
      password,
    );
    await updateProfile(credential.user, { displayName });
    await setDoc(doc(db!, "users", credential.user.uid), {
      email,
      displayName,
      createdAt: serverTimestamp(),
    });
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth!, email, password);
  }

  async function logout() {
    await signOut(auth!);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
