import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import NeuralConsole from "../components/NeuralConsole"; // Twój główny czat
import TrainingCenter from "../components/TrainingCenter"; // Moduł treningowy z terminalem
import MemoryVault from "../components/MemoryVault"; // Nowy moduł MongoDB Vault

const Dashboard: React.FC = () => {
    // Stan zarządzający aktywną zakładką
    const [activeTab, setActiveTab] = useState<string>("console");

    // Funkcja renderująca odpowiedni moduł w zależności od wyboru w Sidebarze
    const renderContent = () => {
        switch (activeTab) {
            case "console":
                return <NeuralConsole />;
            case "training":
                return <TrainingCenter />;
            case "vault":
                return <MemoryVault />;
            default:
                return <NeuralConsole />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
            {/* Przekazujemy funkcję zmiany zakładki do Sidebaru */}
            <Sidebar onTabChange={setActiveTab} activeTab={activeTab} />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                {/* Dynamiczny kontener na treść */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;