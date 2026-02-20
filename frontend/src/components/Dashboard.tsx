import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import NeuralConsole from "../components/NeuralConsole";
import TrainingCenter from "../components/TrainingCenter";
import MemoryVault from "../components/MemoryVault";
import NeuralMap from "../components/NeuralMap";

const Dashboard: React.FC = () => {
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
                return <NeuralMap />;
            default:
                return <NeuralConsole />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
            <Sidebar onTabChange={setActiveTab} activeTab={activeTab} />
            <div className="flex flex-col flex-1 min-w-0">
                <Header />
                <main className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;