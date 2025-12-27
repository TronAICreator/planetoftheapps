export { metadata } from './metadata';
import WorkspaceSidebar from "../../../components/WorkspaceSidebar";

export default function WorkspaceLayout({ children }) {
    return (
        <div className="flex h-screen bg-gray-50">
            <WorkspaceSidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}