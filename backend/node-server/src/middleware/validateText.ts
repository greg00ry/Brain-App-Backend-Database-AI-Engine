import { error } from "console";
import { Request, Response, NextFunction } from "express";

export const validateText = (req: Request, res: Response, next: NextFunction) => {
    const { text } = req.body

    //Sprawdzenie czy text istnieje
    if (!text) {
        return res.status(400).json({
            error: "Validation failed: 'text' field is required."
        })
    }

    //Sprawdzenie typu
    if (typeof text !== "string") {
        return res.status(400).json({
            error: "Validation failed: 'text' must be a string"
        })
    }

    //Sprawdzenie długosci 
    if ( text.trim().length < 3) {
        return res.status(400).json({
            error: "Validation failed: text is too short to analyze"
        })
    }

    next()
}