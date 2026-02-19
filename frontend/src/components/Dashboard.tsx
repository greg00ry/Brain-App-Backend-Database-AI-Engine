import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import NeuralConsole from "../components/NeuralConsole";
import TrainingCenter from "../components/TrainingCenter";
import MemoryVault from "../components/MemoryVault";
import NeuralMap from "../components/NeuralMap"; // Importujemy nową mapę

const Dashboard: React.FC = () => {
    // Stan zarządzający wszystkimi widokami
    const [activeTab, setActiveTab] = useState<string>("console");

    const renderContent = () => {
        switch (activeTab) {
            case "console":
                return <NeuralConsole />;
            case "training":
                return <TrainingCenter />;
            case "vault":
                return <MemoryVault />;
            case "map":
                return <NeuralMap />; // <--- NOWY WIDOK PODPIĘTY
            default:
                return <NeuralConsole />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
            {/* Sidebar dostaje activeTab, żeby wiedzieć, który przycisk podświetlić */}
            <Sidebar onTabChange={setActiveTab} activeTab={activeTab} />
            
            <div className="flex flex-col flex-1">
                <Header />
                <main className="flex-1 flex flex-col overflow-hidden">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;