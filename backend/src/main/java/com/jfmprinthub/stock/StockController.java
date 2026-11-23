package com.jfmprinthub.stock;

import com.jfmprinthub.common.PageResponse;
import com.jfmprinthub.stock.StockDtos.CountResultLine;
import com.jfmprinthub.stock.StockDtos.MovementResponse;
import com.jfmprinthub.stock.StockDtos.PhysicalCountRequest;
import com.jfmprinthub.stock.StockDtos.ReconciliationLine;
import com.jfmprinthub.stock.StockDtos.StockInRequest;
import com.jfmprinthub.stock.StockDtos.StockOutRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Tag(name = "Stock ledger")
@RestController
@RequestMapping("/api/v1/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockOperationsService service;

    @GetMapping("/movements")
    public PageResponse<MovementResponse> movements(
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) MovementType type,
            @RequestParam(required = false) MovementReason reason,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return service.search(productId, type, reason, from, to, q, page, size);
    }

    @PostMapping("/in")
    @ResponseStatus(HttpStatus.CREATED)
    public List<MovementResponse> stockIn(@Valid @RequestBody StockInRequest request) {
        return service.stockIn(request);
    }

    @PostMapping("/out")
    @ResponseStatus(HttpStatus.CREATED)
    public List<MovementResponse> stockOut(@Valid @RequestBody StockOutRequest request) {
        return service.stockOut(request);
    }

    @PostMapping("/count")
    public List<CountResultLine> count(@Valid @RequestBody PhysicalCountRequest request) {
        return service.physicalCount(request);
    }

    @GetMapping("/reconciliation")
    public List<ReconciliationLine> reconciliation() {
        return service.reconciliation();
    }
}
