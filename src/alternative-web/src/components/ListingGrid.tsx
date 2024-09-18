// @@filename: src/components/ListingGrid.tsx
import React from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Listing from './Listing';
import { ListingWithState } from '../context/PropertyContext';

interface ListingGridProps {
    listings: ListingWithState[];
    lastListingRef: (node: HTMLDivElement | null) => void;
}

const ListingGrid: React.FC<ListingGridProps> = ({ listings, lastListingRef }) => {
    const COLUMN_WIDTH = 400;
    const ROW_HEIGHT = 500;

    const Cell = ({ columnIndex, rowIndex, style }: any) => {
        const index = rowIndex * 3 + columnIndex;
        if (index >= listings.length) return null;

        const listingWithState = listings[index];
        const isLastElement = index === listings.length - 1;

        return (
            <div style={style} ref={isLastElement ? lastListingRef : null}>
                <Listing listingWithState={listingWithState} />
            </div>
        );
    };

    return (
        <div className="listing-grid" style={{ height: '800px', width: '100%' }}>
            <AutoSizer>
                {({ height, width }) => {
                    const columnCount = Math.floor(width / COLUMN_WIDTH);
                    const rowCount = Math.ceil(listings.length / columnCount);

                    return (
                        <Grid
                            columnCount={columnCount}
                            columnWidth={COLUMN_WIDTH}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={ROW_HEIGHT}
                            width={width}
                        >
                            {Cell}
                        </Grid>
                    );
                }}
            </AutoSizer>
        </div>
    );
};

export default React.memo(ListingGrid);
