import { useEffect, useMemo, useState } from "react";
import { useBoolean } from "@fluentui/react-hooks"
import { FontIcon, Stack, Text } from "@fluentui/react";
import rehypeRaw from "rehype-raw";

import styles from "./Answer.module.css";

import { AskResponse, Citation } from "../../api";
import { parseAnswer } from "./AnswerParser";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import supersub from 'remark-supersub'

interface Props {
    answer: AskResponse;
    onCitationClicked: (citedDocument: Citation) => void;
}

export const Answer = ({
    answer,
    onCitationClicked
}: Props) => {
    const [isRefAccordionOpen, { toggle: toggleIsRefAccordionOpen }] = useBoolean(true);
    const filePathTruncationLimit = 50;

    const parsedAnswer = useMemo(() => parseAnswer(answer), [answer]);
    const [chevronIsExpanded, setChevronIsExpanded] = useState(isRefAccordionOpen);

    const handleChevronClick = () => {
        setChevronIsExpanded(!chevronIsExpanded);
        toggleIsRefAccordionOpen();
    };

    useEffect(() => {
        setChevronIsExpanded(isRefAccordionOpen);
    }, [isRefAccordionOpen]);

    const extractRelevanceScore = (citation: Citation) => {

        if (!citation || !citation.metadata || !citation.metadata.chunking) {
            return null;
        }

        //e.g. of this: orignal document size=321. Scores=3.374172Org Highlight count=7.
        const input = citation.metadata?.chunking 

        // Regular expression to find 'Scores=' followed by numbers (and possibly a decimal point)
        const regex = /Scores=(\d+(\.\d+)?)/;
        const matches = input.match(regex);

        // Check if we found a match
        if (matches && matches[1]) {
            // Parse and return the number
            return parseFloat(matches[1]);
        } else {
            // Return null if no match was found
            return null;
        }
    }

    const createCitationFilepath = (citation: Citation, index: number, truncate: boolean = false) => {
        let citationFilename = "";

        if (citation.filepath && citation.chunk_id) {
            if (truncate && citation.filepath.length > filePathTruncationLimit) {
                const citationLength = citation.filepath.length;
                citationFilename = `${citation.filepath.substring(0, 20)}...${citation.filepath.substring(citationLength - 20)} - Part ${parseInt(citation.chunk_id) + 1}`;
            }
            else {
                citationFilename = `${citation.filepath} - Part ${parseInt(citation.chunk_id) + 1}`;
            }
        }
        else if (citation.filepath && citation.reindex_id) {
            citationFilename = `${citation.filepath} - Part ${citation.reindex_id}`;
        }
        else {
            citationFilename = `Citation ${index}`;
        }
        return citationFilename;
    }

    return (
        <>
            <Stack className={styles.answerFooter}>
                <Stack.Item grow>
                    {
                        // <div style={{ marginTop: 8, display: "flex", flexFlow: "wrap row", maxHeight: "800px", gap: "4px" }}>
                        <div>
                            <h3>Search results:</h3>
                            {parsedAnswer.citations.map((citation, idx) => {
                                return (
                                    <div className={styles.citationContainer}>
                                        <span
                                            title={createCitationFilepath(citation, ++idx)}
                                            tabIndex={0}
                                            role="link"
                                            key={idx}
                                            onClick={() => onCitationClicked(citation)}
                                            onKeyDown={e => e.key === "Enter" || e.key === " " ? onCitationClicked(citation) : null}
                                            className={styles.citationHeaderLink}
                                            aria-label={createCitationFilepath(citation, idx)}
                                        >
                                            <div className={styles.citation}>{idx}</div>
                                            {createCitationFilepath(citation, idx, true)}

                                        </span>
                                        <span>Search result relevance: {extractRelevanceScore(citation)}</span>
                                        <div>
                                            <ReactMarkdown
                                                linkTarget="_blank"
                                                className={styles.citationPanelContent}
                                                children={citation.content}
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[rehypeRaw]}
                                            />
                                        </div>
                                    </div>

                                );
                            })}
                        </div>
                    }
                </Stack.Item>
                <Stack.Item grow>
                    <h3>Generated Summary:</h3>
                    <ReactMarkdown
                        linkTarget="_blank"
                        remarkPlugins={[remarkGfm, supersub]}
                        children={parsedAnswer.markdownFormatText}
                        className={styles.answerText}
                    />
                </Stack.Item>
                <Stack.Item className={styles.answerDisclaimerContainer}>
                    <span className={styles.answerDisclaimer}>AI-generated content may be incorrect</span>
                </Stack.Item>
            </Stack>
        </>
    );
};
